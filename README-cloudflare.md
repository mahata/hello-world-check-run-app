# Hello World Check Run App - Cloudflare Workers Edition

This GitHub App is deployed on Cloudflare Workers and creates a "Hello World" check run when pull requests are created or updated.

## 🚀 Deploy to Cloudflare Workers

### Prerequisites

1. [Cloudflare](https://cloudflare.com) account
2. [Node.js](https://nodejs.org) (18 or higher)
3. [pnpm](https://pnpm.io) package manager

### Setup Instructions

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Authenticate Wrangler**
   ```bash
   npx wrangler login
   ```

3. **Configure Environment Variables**
   Set GitHub App secrets as Cloudflare Workers secrets:
   ```bash
   npx wrangler secret put GITHUB_APP_ID
   npx wrangler secret put GITHUB_APP_PRIVATE_KEY_BASE64
   npx wrangler secret put GITHUB_WEBHOOK_SECRET
   ```

4. **Create KV Namespace (Optional)**
   ```bash
   npx wrangler kv:namespace create "KV"
   npx wrangler kv:namespace create "KV" --preview
   ```
   Update the generated IDs in the KV namespace configuration in `wrangler.toml`.

5. **Build and Deploy**
   ```bash
   pnpm run cf:deploy
   ```

### Development Commands

- **Start Local Development Server**
  ```bash
  pnpm run cf:dev
  ```

- **View Logs**
  ```bash
  pnpm run cf:tail
  ```

- **Run Tests**
  ```bash
  pnpm test
  ```

## 📝 Configuration

### wrangler.toml

Cloudflare Workers configuration is managed in the `wrangler.toml` file:

```toml
name = "hello-world-check-run-app"
main = "dist/index.js"
compatibility_date = "2024-09-23"

[vars]
NODE_ENV = "production"
```

### Environment Variables

The following environment variables must be set as Cloudflare Workers secrets:

- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_APP_PRIVATE_KEY_BASE64`: GitHub App private key (Base64 encoded)
- `GITHUB_WEBHOOK_SECRET`: Webhook secret

## 🔗 Endpoints

After deployment, the following endpoints will be available:

- `GET /`: Application status check
- `POST /webhooks`: GitHub Webhook receiver endpoint
- `GET /health`: Health check

## 🛠️ Troubleshooting

### Common Issues

1. **Deployment Error**: Check `wrangler.toml` configuration
2. **Webhook Authentication Error**: Verify secrets are configured correctly
3. **Environment Variable Error**: Ensure all required secrets are set

### View Logs

```bash
pnpm run cf:tail
```

to view real-time logs.

## 📚 References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
