// Cloudflare Workers型定義
declare global {
	interface KVNamespace {
		get(key: string): Promise<string | null>;
		put(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
		list(): Promise<{ keys: { name: string }[] }>;
	}
}

export {};
