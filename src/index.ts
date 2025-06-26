import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { Webhooks } from "@octokit/webhooks";
import { Hono } from "hono";

// Cloudflare Workers環境用の型定義
interface Env {
	GITHUB_APP_ID: string;
	GITHUB_APP_PRIVATE_KEY_BASE64: string;
	GITHUB_WEBHOOK_SECRET: string;
	KV?: KVNamespace;
}

// GitHub Webhook payload types
interface PullRequestPayload {
	repository: {
		owner: { login: string };
		name: string;
	};
	pull_request: {
		number: number;
		head: { sha: string };
	};
	installation?: {
		id: number;
	};
}

const app = new Hono<{ Bindings: Env }>();

async function handlePullRequest(payload: PullRequestPayload, env: Env) {
	const { repository, pull_request } = payload;
	const owner = repository.owner.login;
	const repo = repository.name;
	const installationId = payload.installation?.id;
	const headSha = pull_request.head.sha;
	const pullNumber = pull_request.number;

	if (!installationId) {
		console.error("No installation ID found in payload");
		return;
	}

	try {
		console.log(`Processing PR #${pullNumber} in ${owner}/${repo}`);

		// Cloudflare Workers環境でBase64デコード
		const privateKeyPem = atob(env.GITHUB_APP_PRIVATE_KEY_BASE64);
		
		const auth = createAppAuth({
			appId: parseInt(env.GITHUB_APP_ID, 10),
			privateKey: privateKeyPem,
		});

		const { token } = await auth({
			type: "installation",
			installationId: installationId,
		});

		const octokit = new Octokit({
			auth: token,
		});

		const response = await octokit.rest.checks.create({
			owner,
			repo,
			name: "Hello World Check",
			head_sha: headSha,
			status: "completed",
			conclusion: "success",
			output: {
				title: "Hello World Message",
				summary: `This is a simple 'Hello, world!' message from your GitHub App for PR #${pullNumber}.`,
				text: "The check was successfully created by your GitHub App for this pull request.",
			},
		});

		console.log(`Check run created successfully for PR #${pullNumber}!`);
		console.log("Check Run ID:", response.data.id);
		console.log("Check Run URL:", response.data.html_url);
	} catch (error) {
		console.error(`Failed to create check run for PR #${pullNumber}:`, error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
		}
	}
}

app.get("/", (c) => {
	return c.json({
		message: "Hello World GitHub App is running on Cloudflare Workers with Hono!",
		timestamp: new Date().toISOString(),
		framework: "Hono",
		runtime: "Cloudflare Workers",
	});
});

app.post("/webhooks", async (c) => {
	try {
		const env = c.env;
		
		if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY_BASE64 || !env.GITHUB_WEBHOOK_SECRET) {
			console.error("Required environment variables are not set");
			return c.text("Internal Server Error", 500);
		}

		const webhooks = new Webhooks({
			secret: env.GITHUB_WEBHOOK_SECRET,
		});

		webhooks.on("pull_request.opened", async ({ payload }) => {
			await handlePullRequest(payload, env);
		});

		webhooks.on("pull_request.synchronize", async ({ payload }) => {
			await handlePullRequest(payload, env);
		});

		const body = await c.req.text();
		const headers = c.req.header();

		await webhooks.verifyAndReceive({
			id: headers["x-github-delivery"] as string,
			name: headers["x-github-event"] as string,
			signature: headers["x-hub-signature-256"] as string,
			payload: body,
		});

		return c.text("OK", 200);
	} catch (error) {
		console.error("Webhook verification failed:", error);
		return c.text("Bad Request", 400);
	}
});

app.get("/health", (c) => {
	return c.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		runtime: "Cloudflare Workers",
	});
});

export default app;
