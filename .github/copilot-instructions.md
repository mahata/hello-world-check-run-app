## Overall Rules

Please do not commit unless your `pnpm test:run` passes. Also, tag with `@terminal` when questions are about `Git`.

As a friendly colleague, please answer questions in a casual tone!

## Package Management

Please use `pnpm` as a package manager. However, try to avoid introducing unnecessary packages. For example, prioritize built-in implementations like `fetch` instead of `axios` when making HTTP requests.

## Implementation

Write code in `TypeScript` and avoid using the `any` type when possible. Maintain code formatting as much as possible according to `Biome` rules, and write highly readable and maintainable code.

Please avoid code comments. Instead, consider using descriptive variable names to make it clear what the code does on its own.

Delete any unnecessary code or files once implementation is done.

## Testing

Create tests along with feature implementation. For test files, place them in the same directory as implementation files. Please use `Vitest` for writing tests.
