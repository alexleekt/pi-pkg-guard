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
