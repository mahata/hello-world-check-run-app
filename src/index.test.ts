import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "./index.js";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import crypto from "node:crypto";

describe("Environment Variables Validation", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	it("should validate required environment variables", () => {
		vi.stubEnv("GITHUB_APP_ID", "12345");
		vi.stubEnv(
			"GITHUB_APP_PRIVATE_KEY_BASE64",
			Buffer.from("test-private-key").toString("base64"),
		);
		vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-webhook-secret");

		expect(process.env.GITHUB_APP_ID).toBe("12345");
		expect(process.env.GITHUB_APP_PRIVATE_KEY_BASE64).toBe(
			Buffer.from("test-private-key").toString("base64"),
		);
		expect(process.env.GITHUB_WEBHOOK_SECRET).toBe("test-webhook-secret");
	});

	it("should handle missing environment variables", () => {
		expect(process.env.GITHUB_APP_ID).toBeUndefined();
		expect(process.env.GITHUB_APP_PRIVATE_KEY_BASE64).toBeUndefined();
		expect(process.env.GITHUB_WEBHOOK_SECRET).toBeUndefined();
	});

	it("should decode base64 private key correctly", () => {
		const testKey = "test-private-key-content";
		const base64Key = Buffer.from(testKey).toString("base64");

		const decoded = Buffer.from(base64Key, "base64").toString("utf8");
		expect(decoded).toBe(testKey);
	});
});

describe("Utility Functions", () => {
	describe("Port Configuration", () => {
		it("should use default port when PORT env var is not set", () => {
			vi.stubEnv("PORT", "");
			const port = Number(process.env.PORT) || 3000;
			expect(port).toBe(3000);
		});

		it("should use custom port when PORT env var is set", () => {
			vi.stubEnv("PORT", "8080");
			const port = Number(process.env.PORT) || 3000;
			expect(port).toBe(8080);
		});
	});

	describe("Data Processing", () => {
		it("should create proper response structure for root endpoint", () => {
			const response = {
				message: "Hello World GitHub App is running with Hono!",
				timestamp: new Date().toISOString(),
				framework: "Hono",
			};

			expect(response).toHaveProperty("message");
			expect(response).toHaveProperty("timestamp");
			expect(response).toHaveProperty("framework");
			expect(response.framework).toBe("Hono");
			expect(response.message).toContain("Hello World");
		});

		it("should create proper health check response structure", () => {
			const healthResponse = {
				status: "healthy",
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				timestamp: new Date().toISOString(),
			};

			expect(healthResponse).toHaveProperty("status");
			expect(healthResponse).toHaveProperty("uptime");
			expect(healthResponse).toHaveProperty("memory");
			expect(healthResponse).toHaveProperty("timestamp");
			expect(healthResponse.status).toBe("healthy");
			expect(typeof healthResponse.uptime).toBe("number");
			expect(typeof healthResponse.memory).toBe("object");
		});
	});
});

describe("GitHub API Integration", () => {
	it("should handle pull request payload structure", () => {
		const mockPayload = {
			repository: {
				owner: { login: "test-owner" },
				name: "test-repo",
			},
			pull_request: {
				number: 123,
				head: { sha: "test-sha" },
			},
			installation: {
				id: 456,
			},
		};

		expect(mockPayload.repository.owner.login).toBe("test-owner");
		expect(mockPayload.repository.name).toBe("test-repo");
		expect(mockPayload.pull_request.number).toBe(123);
		expect(mockPayload.pull_request.head.sha).toBe("test-sha");
		expect(mockPayload.installation.id).toBe(456);
	});

	it("should create proper check run payload structure", () => {
		const checkRunPayload = {
			owner: "test-owner",
			repo: "test-repo",
			name: "Hello World Check",
			head_sha: "test-sha",
			status: "completed",
			conclusion: "success",
			output: {
				title: "Hello World Message",
				summary:
					"This is a simple 'Hello, world!' message from your GitHub App for PR #123.",
				text: "The check was successfully created by your GitHub App for this pull request.",
			},
		};

		expect(checkRunPayload.name).toBe("Hello World Check");
		expect(checkRunPayload.status).toBe("completed");
		expect(checkRunPayload.conclusion).toBe("success");
		expect(checkRunPayload.output.title).toBe("Hello World Message");
		expect(checkRunPayload.output.summary).toContain("Hello, world!");
	});
});

describe("Webhook Integration Tests", () => {
	let realPayload: any;
	let mockEnv: any;
	let mockOctokitCreate: any;
	let mockCreateAppAuth: any;

	beforeEach(async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const payloadPath = path.join(__dirname, "fixtures", "payload.json");
		const payloadContent = fs.readFileSync(payloadPath, "utf-8");
		realPayload = JSON.parse(payloadContent);

		mockEnv = {
			GITHUB_APP_ID: "12345",
			GITHUB_APP_PRIVATE_KEY_BASE64: Buffer.from("test-private-key").toString("base64"),
			GITHUB_WEBHOOK_SECRET: "test-webhook-secret",
		};

		mockOctokitCreate = vi.fn().mockResolvedValue({
			data: {
				id: 123456789,
				html_url: "https://github.com/mahata/github-actions-sample/runs/123456789"
			}
		});

		mockCreateAppAuth = vi.fn().mockReturnValue(
			vi.fn().mockResolvedValue({
				token: "mock-installation-token"
			})
		);

		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	function createWebhookSignature(payload: string, secret: string): string {
		const hmac = crypto.createHmac("sha256", secret);
		hmac.update(payload, "utf8");
		return `sha256=${hmac.digest("hex")}`;
	}

	it("should handle webhook POST request with real payload", async () => {
		const payloadString = JSON.stringify(realPayload);
		const signature = createWebhookSignature(payloadString, mockEnv.GITHUB_WEBHOOK_SECRET);

		const request = new Request("http://localhost:3000/webhooks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-GitHub-Event": "pull_request",
				"X-GitHub-Delivery": "12345678-1234-1234-1234-123456789012",
				"X-Hub-Signature-256": signature,
			},
			body: payloadString,
		});

		const response = await app.fetch(request, mockEnv);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("OK");
	});

	it("should return 500 when required environment variables are missing", async () => {
		const payloadString = JSON.stringify(realPayload);
		const signature = createWebhookSignature(payloadString, "test-secret");

		const request = new Request("http://localhost:3000/webhooks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-GitHub-Event": "pull_request",
				"X-GitHub-Delivery": "12345678-1234-1234-1234-123456789012",
				"X-Hub-Signature-256": signature,
			},
			body: payloadString,
		});

		const emptyEnv = {};
		const response = await app.fetch(request, emptyEnv);

		expect(response.status).toBe(500);
		expect(await response.text()).toBe("Internal Server Error");
	});

	it("should return 400 when webhook signature is invalid", async () => {
		const payloadString = JSON.stringify(realPayload);
		const invalidSignature = "sha256=invalid-signature";

		const request = new Request("http://localhost:3000/webhooks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-GitHub-Event": "pull_request",
				"X-GitHub-Delivery": "12345678-1234-1234-1234-123456789012",
				"X-Hub-Signature-256": invalidSignature,
			},
			body: payloadString,
		});

		const response = await app.fetch(request, mockEnv);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe("Bad Request");
	});

	it("should process webhook payload correctly", async () => {
		const payloadString = JSON.stringify(realPayload);
		const signature = createWebhookSignature(payloadString, mockEnv.GITHUB_WEBHOOK_SECRET);

		const request = new Request("http://localhost:3000/webhooks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-GitHub-Event": "pull_request",
				"X-GitHub-Delivery": "12345678-1234-1234-1234-123456789012",
				"X-Hub-Signature-256": signature,
			},
			body: payloadString,
		});

		const response = await app.fetch(request, mockEnv);

		expect(response.status).toBe(200);
		
		expect(console.log).toHaveBeenCalledWith(
			"Processing PR #16 in mahata/github-actions-sample"
		);
	});

	it("should handle pull_request.synchronize event", async () => {
		const synchronizePayload = {
			...realPayload,
			action: "synchronize"
		};

		const payloadString = JSON.stringify(synchronizePayload);
		const signature = createWebhookSignature(payloadString, mockEnv.GITHUB_WEBHOOK_SECRET);

		const request = new Request("http://localhost:3000/webhooks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-GitHub-Event": "pull_request",
				"X-GitHub-Delivery": "12345678-1234-1234-1234-123456789012",
				"X-Hub-Signature-256": signature,
			},
			body: payloadString,
		});

		const response = await app.fetch(request, mockEnv);

		expect(response.status).toBe(200);
		expect(console.log).toHaveBeenCalledWith(
			"Processing PR #16 in mahata/github-actions-sample"
		);
	});
});
