import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { Webhooks } from "@octokit/webhooks";
import dotenv from 'dotenv';

dotenv.config();

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;

const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

if (!appId || !privateKey || !webhookSecret) {
    console.error("Error: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_BASE64, and GITHUB_WEBHOOK_SECRET environment variables must be set.");
    process.exit(1);
}

let privateKeyPem: string;
try {
    privateKeyPem = Buffer.from(privateKey, 'base64').toString('utf8');
} catch (e) {
    console.error("Error: Could not decode GITHUB_APP_PRIVATE_KEY_BASE64. Ensure it's a valid Base64 string.");
    process.exit(1);
}

const webhooks = new Webhooks({
    secret: webhookSecret,
});

const auth = createAppAuth({
    appId: parseInt(appId, 10),
    privateKey: privateKeyPem,
});

webhooks.on('pull_request.opened', async ({ payload }) => {
    await handlePullRequest(payload);
});

webhooks.on('pull_request.synchronize', async ({ payload }) => {
    await handlePullRequest(payload);
});

async function handlePullRequest(payload: any) {
    const { repository, pull_request } = payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    const installationId = payload.installation.id;
    const headSha = pull_request.head.sha;
    const pullNumber = pull_request.number;

    try {
        console.log(`Processing PR #${pullNumber} in ${owner}/${repo}`);

        const { token } = await auth({ 
            type: "installation", 
            installationId: installationId 
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

app.get('/', (c) => {
    return c.json({ 
        message: 'Hello World GitHub App is running with Hono!',
        timestamp: new Date().toISOString(),
        framework: 'Hono'
    });
});

app.post('/webhooks', async (c) => {
    try {
        const body = await c.req.text();
        const headers = c.req.header();
        
        await webhooks.verifyAndReceive({
            id: headers['x-github-delivery'] as string,
            name: headers['x-github-event'] as string,
            signature: headers['x-hub-signature-256'] as string,
            payload: body,
        });
        
        return c.text('OK', 200);
    } catch (error) {
        console.error('Webhook verification failed:', error);
        return c.text('Bad Request', 400);
    }
});

app.get('/health', (c) => {
    return c.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

console.log(`Starting GitHub App server on port ${PORT}...`);
serve({
    fetch: app.fetch,
    port: PORT,
}, (info) => {
    console.log(`GitHub App server is running on port ${info.port}`);
    console.log(`Webhook endpoint: http://localhost:${info.port}/webhooks`);
    console.log(`Health check: http://localhost:${info.port}/health`);
});
