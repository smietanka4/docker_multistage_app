const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("jsonwebtoken");
jest.mock("jwks-rsa", () => {
  return jest.fn().mockImplementation(() => {
    return {
      getSigningKey: jest.fn(),
    };
  });
});

const app = require("../server");

describe("Authentication", () => {
  test("GET /health bez tokenu → 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });

  test("GET /events bez tokenu → 401", async () => {
    const res = await request(app).get("/events");
    expect(res.status).toBe(401);
  });

  test("GET /events z invalidnym tokenem → 401", async () => {
    jwt.verify.mockImplementation((token, key, options, callback) => {
      callback(new Error("invalid token"), null);
    });

    const res = await request(app)
      .get("/events")
      .set("Authorization", "Bearer invalid_token");
    expect(res.status).toBe(401);
  });

  test("PUT /events bez admin roli → 403", async () => {
    jwt.verify.mockImplementation((token, key, options, callback) => {
      callback(null, { realm_access: { roles: ["user"] } });
    });

    const res = await request(app)
      .put("/events/1")
      .set("Authorization", `Bearer mock_user_token`);
    expect(res.status).toBe(403);
  });
});
