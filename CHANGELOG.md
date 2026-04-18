# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/alexleekt/pi-pkg-guard/releases/tag/v0.1.0
