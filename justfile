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
    echo "GitHub Actions will now:"
    echo "  1. Run all checks (biome, tests, typecheck)"
    echo "  2. Publish to npm with provenance"
    echo ""
    echo "Monitor progress at: https://github.com/alexleekt/pi-pkg-guard/actions"

# Release with changelog and notes (interactive)
# Usage: just release-notes [VERSION]
# Examples:
#   just release-notes 0.3.0     # Explicit version
#   just release-notes             # Auto-detect from package.json
release-notes version="":
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
        exit 1
    fi
    
    echo "🏷️  Creating release v$VERSION with notes..."
    git tag -a "v$VERSION" -m "Release v$VERSION"
    git push origin "v$VERSION"
    echo ""
    echo "✅ Tag v$VERSION pushed!"
    echo ""
    echo "Now create a GitHub release at:"
    echo "  https://github.com/alexleekt/pi-pkg-guard/releases/new?tag=v$VERSION"
    echo ""
    echo "The release will trigger automatic npm publish with provenance."
