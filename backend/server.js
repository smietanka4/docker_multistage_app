const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");
const cors = require("cors");
const os = require("os");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

let totalRequests = 0;
app.use((req, res, next) => {
  totalRequests++;
  next();
});

const port = process.env.PORT || 3001;

const getSecretOrEnv = (secretName, envName) => {
  const secretPath = `/run/secrets/${secretName}`;
  const fs = require("fs");
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, "utf8").trim();
  }
  return process.env[envName];
};

const pool = new Pool({
  host: process.env.DB_HOST,
  user: getSecretOrEnv("db_user", "DB_USER"),
  password: getSecretOrEnv("db_password", "DB_PASSWORD"),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

async function initializeDatabase() {
  console.log("Checking database tables...");

  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(123456789);");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL
      );
    `;

    await client.query(createTableQuery);

    const createUsersQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username varchar(255) NOT NULL UNIQUE,
        email varchar(255),
        role varchar(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
        );
      `;

    await client.query(createUsersQuery);

    const constraintRoles = `ALTER TABLE events ADD COLUMN created_by UUID REFERENCES users(id);`

    await client.query(constraintRoles);

    try {
      await client.query(
        "ALTER TABLE events ALTER COLUMN date TYPE TIMESTAMP USING date::TIMESTAMP;",
      );
    } catch (e) {
      if (e.code !== "42710" && e.code !== "42P07") {
        throw e;
      }
    }

    console.log('Table "events" verified/created');
  } finally {
    await client.query("SELECT pg_advisory_unlock(123456789);");
    client.release();
  }
}

const jwksClient = jwksClient({
  jwksUri: `https://${process.env.KEYCLOAK_HOST}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
} 

const checkRole = (role) => {
  return (req, res, next) => {
    const roles = req.user?.realm_access?.roles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  }; 
}

async function startServer() {
  await redisClient.connect();
  console.log("Connected to Redis");

  await initializeDatabase();

  app.listen(port, () => console.log(`Backend running on port ${port}`));
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP" });
});

app.get("/stats", checkJwt, async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM events");
    const totalEvents = parseInt(result.rows[0].count, 10);
    const backendInstanceId = os.hostname();

    res.json({
      totalEvents,
      backendInstanceId,
      totalRequests,
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Stats query failed" });
  }
});

app.get("/events",checkJwt, async (req, res) => {
  const cacheKey = "events_list";

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cachedData));
    }

    const result = await pool.query("SELECT * FROM events ORDER BY date ASC");
    const events = result.rows;

    await redisClient.set(cacheKey, JSON.stringify(events), { EX: 60 });

    res.setHeader("X-Cache", "MISS");
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/events", checkJwt, async (req, res) => {
  const { title, description, date } = req.body;
  try {
    await pool.query(
      "INSERT INTO events (title, description, date) VALUES ($1, $2, $3)",
      [title, description, date],
    );

    await redisClient.del("events_list");
    res.status(201).json({ message: "Event created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

startServer().catch(console.error);

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  await pool.end();
  console.log("Postgress pool closed");

  await redisClient.quit();
  console.log("Redis client disconnected");

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
