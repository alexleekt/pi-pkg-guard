# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.9] - 2026-04-18

### Fixed

- Fix GitHub token permissions for release creation (needs `contents: write`)

## [0.4.8] - 2026-04-18

### Fixed

- **MAJOR**: Use Node.js 24 instead of 22 for built-in npm 11+ Trusted Publishing support
- Simplified workflow following npm official documentation
- Remove --provenance flag (automatic with OIDC)
- Remove workarounds for broken npm toolcache

## [0.4.7] - 2026-04-18

### Fixed

- Fixed shellcheck quoting warnings in CI workflow

## [0.4.6] - 2026-04-18

### Fixed

- Install npm directly from registry tarball instead of Corepack or self-upgrade
- Fixes broken npm toolcache in Node.js 22.22.2 GitHub Actions runners

## [0.4.5] - 2026-04-18

### Fixed

- Use Corepack to enable npm instead of broken `npm install -g npm@latest`
- Workaround for Node.js 22.22.2 toolcache issue with missing `promise-retry` module

## [0.4.4] - 2026-04-18

### Fixed

- Upgrade npm to latest version in CI for Trusted Publishing compatibility
- Fixes misleading 404 error from npm <10 with OIDC trusted publishing

## [0.4.3] - 2026-04-18

### Fixed

- Fixed npm authentication for Trusted Publishing by removing NODE_AUTH_TOKEN override
- Let actions/setup-node handle OIDC token exchange automatically

## [0.4.2] - 2026-04-18

### Fixed

- Fixed npm Trusted Publishing workflow configuration
- Added debugging and auth clearing steps for OIDC token exchange

## [0.4.1] - 2026-04-18

### Fixed

- Fixed import statement ordering to satisfy Biome `check` command in CI
- Corrected `node:child_process` and `node:fs` imports to be alphabetically sorted

## [0.4.0] - 2026-04-17

### Fixed

- Removed duplicate `check` job in CI workflow that was causing redundant runs

### Changed

- Upgraded GitHub Actions to Node.js 22 for native TypeScript test support
- Updated actions to `actions/checkout@v6` and `actions/setup-node@v6`
- Added actionlint and git hooks for pre-commit validation
- Improved CI test glob patterns for cross-platform compatibility

## [0.3.0] - 2026-04-16

### Added

- **Automated CI/CD**: GitHub Actions workflows for testing and publishing
- **Trusted Publishing**: OIDC-based npm authentication (no long-lived tokens needed)
- **Auto-release**: Pushing a git tag automatically creates GitHub Release and publishes to npm
- **Provenance**: Packages now publish with attestation linking to GitHub source

### Changed

- Simplified release process: `just release` now auto-detects version from package.json
- Updated documentation with Trusted Publishing setup instructions

## [0.2.0] - 2026-04-15

### Added

- **Enhanced package detection**: Added support for `*-pi` suffix packages (e.g., `lsp-pi`)
- **Keyword validation**: Packages are now validated via `package.json` keywords (`pi-coding-agent`, `pi-extension`, `pi-package`) to filter out non-pi packages
- Improved scoped package detection for packages ending with `-pi`

### Fixed

- Removed duplicate `pi-extension` from `PI_KEYWORDS` constant
- Updated README documentation to reflect new detection patterns

## [0.1.1] - 2026-04-12

### Fixed

- Improved type guard validation with better indentation
- Fixed repository name references

## [0.1.0] - 2026-04-11

### Added

- Initial release of pi-pkg-guard extension
- **Startup Check**: Detect orphaned packages on pi startup (debounced to once/hour)
- **Sync Command**: `/pi-pkg-guard` - Auto-register orphaned packages in settings.json
- **npm Guard**: Warns when bash tool runs `npm install -g pi-*` commands
- Support for both `pi-foo` and `npm:pi-foo` package name formats
- Exclusion of core package `@mariozechner/pi-coding-agent` from orphaned detection
- Comprehensive test suite with 100 test cases covering type guards, package analysis, and regex patterns
- Type-safe TypeScript implementation with proper interfaces and type guards

### Technical Details

- Uses Pi Extension API (`ExtensionAPI`) for seamless integration
- Namespaced status key: `ext:pi-pkg-guard:v1`
- Silent failure mode for non-critical operations (never blocks pi)
- 1-hour debounce on startup checks to avoid excessive npm list calls

[Unreleased]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.9...HEAD
[0.4.9]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.8...v0.4.9
[0.4.8]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.7...v0.4.8
[0.4.7]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/alexleekt/pi-pkg-guard/releases/tag/v0.1.0
