pre-commit:
	@echo "Running pre-commit checks..."
	@pnpm build
	@pnpm run lint
	@pnpm test:run
