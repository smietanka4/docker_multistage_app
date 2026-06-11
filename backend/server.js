const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");
const cors = require("cors");
const os = require("os");
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

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date TIMESTAMP NOT NULL
    );
  `;

  await pool.query(createTableQuery);
  try {
    await pool.query("ALTER TABLE events ALTER COLUMN date TYPE TIMESTAMP USING date::TIMESTAMP;");
  } catch(e) {}
  console.log('Table "events" verified/created');
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

app.get("/stats", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM events");
    const totalEvents = parseInt(result.rows[0].count, 10);
    const backendInstanceId = os.hostname();

    res.json({
      totalEvents,
      backendInstanceId,
      totalRequests
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Stats query failed" });
  }
});

app.get("/events", async (req, res) => {
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

app.post("/events", async (req, res) => {
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
