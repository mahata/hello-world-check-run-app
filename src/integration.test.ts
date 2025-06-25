import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";

function createTestApp() {
	const app = new Hono();

	app.get("/", (c) => {
		return c.json({
			message: "Hello World GitHub App is running with Hono!",
			timestamp: new Date().toISOString(),
			framework: "Hono",
		});
	});

	app.get("/health", (c) => {
		return c.json({
			status: "healthy",
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			timestamp: new Date().toISOString(),
		});
	});

	app.post("/webhooks", async (c) => {
		try {
			const _body = await c.req.text();
			const headers = c.req.header();

			if (headers["x-github-delivery"] && headers["x-github-event"]) {
				return c.text("OK", 200);
			} else {
				return c.text("Bad Request", 400);
			}
		} catch (_error) {
			return c.text("Bad Request", 400);
		}
	});

	return app;
}

describe("Hono Application Integration Tests", () => {
	let app: Hono;

	beforeEach(() => {
		app = createTestApp();
	});

	describe("GET /", () => {
		it("should return correct JSON response", async () => {
			const req = new Request("http://localhost:3000/");
			const res = await app.fetch(req);

			expect(res.status).toBe(200);

			const json = await res.json();
			expect(json).toHaveProperty("message");
			expect(json).toHaveProperty("timestamp");
			expect(json).toHaveProperty("framework");
			expect(json.message).toBe("Hello World GitHub App is running with Hono!");
			expect(json.framework).toBe("Hono");
			expect(typeof json.timestamp).toBe("string");
		});

		it("should have correct content type", async () => {
			const req = new Request("http://localhost:3000/");
			const res = await app.fetch(req);

			expect(res.headers.get("content-type")).toContain("application/json");
		});
	});

	describe("GET /health", () => {
		it("should return health status", async () => {
			const req = new Request("http://localhost:3000/health");
			const res = await app.fetch(req);

			expect(res.status).toBe(200);

			const json = await res.json();
			expect(json).toHaveProperty("status");
			expect(json).toHaveProperty("uptime");
			expect(json).toHaveProperty("memory");
			expect(json).toHaveProperty("timestamp");
			expect(json.status).toBe("healthy");
			expect(typeof json.uptime).toBe("number");
			expect(typeof json.memory).toBe("object");
		});

		it("should include memory usage details", async () => {
			const req = new Request("http://localhost:3000/health");
			const res = await app.fetch(req);

			const json = await res.json();
			expect(json.memory).toHaveProperty("rss");
			expect(json.memory).toHaveProperty("heapTotal");
			expect(json.memory).toHaveProperty("heapUsed");
			expect(json.memory).toHaveProperty("external");
		});
	});

	describe("POST /webhooks", () => {
		it("should accept valid webhook requests", async () => {
			const req = new Request("http://localhost:3000/webhooks", {
				method: "POST",
				headers: {
					"x-github-delivery": "12345-67890-abcdef",
					"x-github-event": "pull_request",
					"x-hub-signature-256": "sha256=test-signature",
					"content-type": "application/json",
				},
				body: JSON.stringify({
					action: "opened",
					pull_request: { number: 123 },
				}),
			});

			const res = await app.fetch(req);
			expect(res.status).toBe(200);

			const text = await res.text();
			expect(text).toBe("OK");
		});

		it("should reject requests without required headers", async () => {
			const req = new Request("http://localhost:3000/webhooks", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({
					action: "opened",
					pull_request: { number: 123 },
				}),
			});

			const res = await app.fetch(req);
			expect(res.status).toBe(400);

			const text = await res.text();
			expect(text).toBe("Bad Request");
		});
	});

	describe("404 Not Found", () => {
		it("should return 404 for unknown routes", async () => {
			const req = new Request("http://localhost:3000/unknown-route");
			const res = await app.fetch(req);

			expect(res.status).toBe(404);
		});
	});
});
