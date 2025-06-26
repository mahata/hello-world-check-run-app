# Hello World Check Run App - Cloudflare Workers版

このGitHub AppはCloudflare Workersでデプロイされ、プルリクエストが作成または更新された際に「Hello World」チェックランを作成します。

## 🚀 Cloudflare Workersへのデプロイ

### 前提条件

1. [Cloudflare](https://cloudflare.com)のアカウント
2. [Node.js](https://nodejs.org) (18以上)
3. [pnpm](https://pnpm.io)パッケージマネージャー

### セットアップ手順

1. **依存関係のインストール**
   ```bash
   pnpm install
   ```

2. **Wranglerの認証**
   ```bash
   npx wrangler login
   ```

3. **環境変数の設定**
   GitHub Appの秘密情報をCloudflare Workersのsecretsとして設定：
   ```bash
   npx wrangler secret put GITHUB_APP_ID
   npx wrangler secret put GITHUB_APP_PRIVATE_KEY_BASE64
   npx wrangler secret put GITHUB_WEBHOOK_SECRET
   ```

4. **KVネームスペースの作成（オプション）**
   ```bash
   npx wrangler kv:namespace create "KV"
   npx wrangler kv:namespace create "KV" --preview
   ```
   作成されたIDを`wrangler.toml`のKVネームスペース設定に更新してください。

5. **ビルドとデプロイ**
   ```bash
   pnpm run cf:deploy
   ```

### 開発用コマンド

- **ローカル開発サーバーの起動**
  ```bash
  pnpm run cf:dev
  ```

- **ログの確認**
  ```bash
  pnpm run cf:tail
  ```

- **テストの実行**
  ```bash
  pnpm test
  ```

## 📝 設定

### wrangler.toml

Cloudflare Workersの設定は`wrangler.toml`ファイルで管理されます：

```toml
name = "hello-world-check-run-app"
main = "dist/index.js"
compatibility_date = "2024-09-23"

[vars]
NODE_ENV = "production"
```

### 環境変数

以下の環境変数をCloudflare Workersのsecretsとして設定する必要があります：

- `GITHUB_APP_ID`: GitHub AppのID
- `GITHUB_APP_PRIVATE_KEY_BASE64`: GitHub Appの秘密鍵（Base64エンコード済み）
- `GITHUB_WEBHOOK_SECRET`: WebhookのSecret

## 🔗 エンドポイント

デプロイ後、以下のエンドポイントが利用可能になります：

- `GET /`: アプリケーションの状態確認
- `POST /webhooks`: GitHub Webhookの受信エンドポイント
- `GET /health`: ヘルスチェック

## 🛠️ トラブルシューティング

### よくある問題

1. **デプロイエラー**: `wrangler.toml`の設定を確認
2. **Webhook認証エラー**: secretsが正しく設定されているか確認
3. **環境変数エラー**: すべての必要なsecretsが設定されているか確認

### ログの確認

```bash
pnpm run cf:tail
```

でリアルタイムログを確認できます。

## 📚 参考資料

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
