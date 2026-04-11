# pi-pkg-guard task runner
# https://github.com/casey/just

# Default recipe - show available tasks
default:
    @just --list

# Run all checks (format, lint, test, typecheck)
check: format lint test typecheck
    @echo "✅ All checks passed!"

# Check code with biome (no fixes)
check-only:
    npx @biomejs/biome check .

# Fix all auto-fixable biome issues
fix:
    npx @biomejs/biome check --write .

# Format code with biome
format:
    npx @biomejs/biome format --write .

# Lint code with biome
lint:
    npx @biomejs/biome lint .

# Run all tests
test:
    node --test test/**/*.test.ts

# Run tests in watch mode
test-watch:
    node --test --watch test/**/*.test.ts

# TypeScript type checking
typecheck:
    npx tsc --noEmit --skipLibCheck

# Clean build artifacts and dependencies
clean:
    rm -rf node_modules dist coverage *.log

# Install dependencies
install:
    npm install

# Dry run npm publish
dry-run:
    npm publish --dry-run

# Publish to npm (requires auth)
publish:
    npm publish --access public

# CI recipe - runs in CI/CD pipelines (no watch mode)
ci: check-only test typecheck
