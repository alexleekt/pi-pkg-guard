# pi-pkg-guard task runner
# https://github.com/casey/just

# Default recipe - show available tasks
default:
    @just --list

# Run all checks (format, lint, test, typecheck)
check: format lint test typecheck lint-actions
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

# Lint GitHub Actions workflows (requires actionlint: brew install actionlint)
lint-actions:
    #!/usr/bin/env bash
    if ! command -v actionlint >/dev/null 2>&1; then
        echo "⚠️  actionlint not installed. Install with: brew install actionlint"
        exit 1
    fi
    actionlint .github/workflows/*.yml

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
ci: check-only test typecheck lint-actions


# Release a new version (triggers GitHub Actions publish)
# Usage: just release [VERSION]
# Examples:
#   just release 0.3.0     # Explicit version
#   just release           # Auto-detect from package.json
release version="":
    #!/usr/bin/env bash
    set -e
    # Auto-detect version from package.json if not provided
    if [ -z "{{version}}" ]; then
        VERSION=$(node -p "require('./package.json').version")
        if [ -z "$VERSION" ] || [ "$VERSION" = "undefined" ]; then
            echo "❌ Error: Could not read version from package.json"
            exit 1
        fi
        echo "📦 Auto-detected version from package.json: $VERSION"
    else
        VERSION="{{version}}"
        echo "📦 Using specified version: $VERSION"
    fi
    
    # Check if tag already exists
    if git rev-parse "v$VERSION" >/dev/null 2>&1; then
        echo "❌ Error: Tag v$VERSION already exists"
        echo "   Use: git tag -d v$VERSION  # to delete locally"
        echo "   Then: git push --delete origin v$VERSION  # to delete remotely"
        exit 1
    fi
    
    
    echo "🏷️  Creating release v$VERSION..."
    git tag -a "v$VERSION" -m "Release v$VERSION"
    git push origin "v$VERSION"
    echo ""
    echo "✅ Tag v$VERSION pushed!"
    echo ""
    echo "GitHub Actions will now automatically:"
    echo "  1. ✅ Run all checks (biome, tests, typecheck)"
    echo "  2. ✅ Publish to npm with provenance"
    echo "  3. ✅ Create GitHub Release with auto-generated notes"
    echo ""
    echo "Monitor progress at: https://github.com/alexleekt/pi-pkg-guard/actions"

# Alias for release (backward compatibility)
# GitHub Releases are now created automatically by the workflow
release-notes version="":
    @just release {{version}}
    @echo ""
    @echo "ℹ️  Note: release-notes is now an alias for 'just release'"
    @echo "   GitHub Releases are created automatically by the workflow."

# Setup git hooks for pre-commit/pre-push checks
setup-hooks:
    #!/usr/bin/env bash
    set -e
    echo "🔧 Installing git hooks..."
    cp .githooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ pre-commit hook installed (runs: just ci)"
    echo ""
    cp .githooks/pre-push .git/hooks/pre-push
    chmod +x .git/hooks/pre-push
    echo "✅ pre-push hook installed (runs: just check)"
    echo ""
    echo "Hooks are now active! To disable temporarily, use --no-verify flag:"
