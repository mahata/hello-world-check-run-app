import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

async function main() {
    // 環境変数からAppの認証情報を取得
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY_BASE64; // Base64エンコードされた秘密鍵
    const installationId = process.env.GITHUB_APP_INSTALLATION_ID; // AppをインストールしたID

    if (!appId || !privateKey || !installationId) {
        console.error("Error: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_BASE64, and GITHUB_APP_INSTALLATION_ID environment variables must be set.");
        process.exit(1);
    }

    let privateKeyPem: string;
    try {
        // Base64デコードする
        privateKeyPem = Buffer.from(privateKey, 'base64').toString('utf8');
    } catch (e) {
        console.error("Error: Could not decode GITHUB_APP_PRIVATE_KEY_BASE64. Ensure it's a valid Base64 string.");
        process.exit(1);
    }

    const auth = createAppAuth({
        appId: parseInt(appId, 10),
        privateKey: privateKeyPem,
        // Octokitインスタンスに直接インストールIDを渡すことで、特定のインストール用のトークンが生成されます
        // token: await createAppAuth({ appId, privateKey }).createToken({ installationId: parseInt(installationId, 10) }).then(res => res.token)
    });

    // Appのインストール用の認証トークンを取得
    let installationToken: string;
    try {
        const { token } = await auth({ type: "installation", installationId: parseInt(installationId, 10) });
        installationToken = token;
        console.log("Successfully obtained GitHub App installation token.");
    } catch (error) {
        console.error("Failed to obtain GitHub App installation token:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
        }
        process.exit(1);
    }

    const octokit = new Octokit({
        auth: installationToken,
        // `request`オプションは、認証されたリクエストを行うOctokitインスタンスをカスタムする場合に便利です
        // request: request.defaults({
        //     headers: {
        //         'X-GitHub-Api-Version': '2022-11-28', // 必要に応じてAPIバージョンを指定
        //     }
        // })
    });

    const owner = process.argv[2];
    const repo = process.argv[3];
    const pullNumber = process.argv[4];

    if (!owner || !repo || !pullNumber) {
        console.error("Usage: pnpm run start <owner> <repo> <pull_number>");
        console.error("Example: pnpm run start mahata vercelog 123");
        process.exit(1);
    }

    try {
        console.log(`Getting pull request information for ${owner}/${repo}#${pullNumber}`);

        // まずリポジトリにアクセスできるかテスト
        console.log("Testing repository access...");
        const repoResponse = await octokit.rest.repos.get({
            owner,
            repo,
        });
        console.log(`Repository access confirmed: ${repoResponse.data.full_name}`);

        // プルリクエスト情報を取得
        const pullResponse = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: parseInt(pullNumber, 10),
        });

        const head_sha = pullResponse.data.head.sha;
        console.log(`Creating check run for ${owner}/${repo} at commit ${head_sha} (PR #${pullNumber})`);

        const response = await octokit.rest.checks.create({
            owner,
            repo,
            name: "Hello World Check",
            head_sha,
            status: "completed",
            conclusion: "success",
            output: {
                title: "Hello World Message",
                summary: `This is a simple 'Hello, world!' message from your CLI tool for PR #${pullNumber}.`,
                text: "The check was successfully created by your GitHub App for this pull request.",
            },
        });

        console.log("Check run created successfully!");
        console.log("Check Run ID:", response.data.id);
        console.log("Check Run URL:", response.data.html_url);
        console.log("Pull Request URL:", pullResponse.data.html_url);

    } catch (error) {
        console.error("Failed to create check run:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error details:", JSON.stringify(error, null, 2));
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error("An unhandled error occurred:", error);
    process.exit(1);
});
