# Hello World Check Run App

A GitHub App built with Hono that creates hello world check runs on pull requests.

## Features

- Creates "Hello World" check runs on pull request events
- Built with Hono framework for fast and lightweight performance
- Webhook verification for secure GitHub integration
- Health check endpoint for monitoring

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   - `GITHUB_APP_ID`: Your GitHub App ID
   - `GITHUB_APP_PRIVATE_KEY_BASE64`: Base64 encoded private key
   - `GITHUB_WEBHOOK_SECRET`: Webhook secret for verification
   - `PORT`: Server port (default: 3000)

3. Build and start the application:
   ```bash
   pnpm run build
   pnpm start
   ```

## Development

Start the development server with hot reload:
```bash
pnpm run dev
```

## Testing

This project uses Vitest for testing.

### Run Tests
```bash
# Run tests once
pnpm run test:run

# Run tests in watch mode
pnpm test

# Run tests with coverage report
pnpm run test:coverage

# Run tests with UI
pnpm run test:ui
```

### Test Structure
- `src/index.test.ts` - Unit tests for core functionality
- `src/integration.test.ts` - Integration tests for HTTP endpoints

## API Endpoints

- `GET /` - Returns application status and information
- `POST /webhooks` - GitHub webhook endpoint for receiving events
- `GET /health` - Health check endpoint with system information

## GitHub App Configuration

Configure your GitHub App with the following settings:

- **Webhook URL**: `https://your-domain.com/webhooks`
- **Webhook Secret**: Set the same value as `GITHUB_WEBHOOK_SECRET`
- **Permissions**:
  - Checks: Write
  - Pull requests: Read
- **Events**:
  - Pull request (opened, synchronize)

## License

This project is licensed under the MIT License.
