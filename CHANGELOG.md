# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-04-19

### Added

- **Backup schema**: JSON Schema validation with `schema/backup-data.json` for backup data integrity
- **excludedPackages**: New `GuardConfig` field to filter packages from npm global list
- **Runtime validation**: `validateBackupData()` function with comprehensive schema validation
- **Schema versioning**: `$schema` URL field replacing simple version number
- **Multi-pattern schema URLs**: Backward compatibility for various GitHub raw URL patterns
- **Error handling**: `isFileNotFoundError()` helper for contextual error logging
- **i18n consolidation**: Unified `parseIcuOptions()` function replacing duplicate plural/select parsers
- **Restore flow**: New translations for exclusions (`restore.exclusions_prompt`, `restore.exclusions_yes`, `restore.exclusions_no`, `restore.exclusions_added`)
- **Validation tests**: `test/validation.test.ts` with 48+ test cases for backup schema
- **Version tests**: `test/version.test.ts` for extension version detection
- **Development team**: AI agent definitions in `.pi/agents/` for collaborative development

### Changed

- **Backup structure**: Simplified `BackupData` interface - removed `registeredPackages`/`orphanedPackages`, added `excludedPackages`
- **Error handling**: Consistent contextual logging across all file operations
- **i18n parsing**: Consolidated `parsePluralOptions()` and `parseSelectOptions()` into single `parseIcuOptions()`
- **Backup messages**: Fixed to show both local and Gist success instead of overwriting

### Fixed

- **i18n**: Removed 3 unused translation keys (`backup.gist_failed`, `config.path_default`, `config.gist_not_configured`)
- **Testing**: Fixed i18n key validation regex to avoid false positives

## [0.7.0] - 2026-04-19

### Added

- **Security validation**: `isValidGistId()` and `isValidBackupPath()` functions for preventing command injection and path traversal attacks
- **Pattern exports**: `NPM_GLOBAL_PATTERN`, `PI_PACKAGE_PATTERN`, and `isGlobalPiInstall()` exported for testing
- **Testing API**: Documented all exported test functions in CONTRIBUTING.md
- **Security documentation**: Added "Security Features" section to USAGE.md

### Changed

- **Lean test suite**: Refactored from 390 to 179 tests with equivalent coverage
- **i18n key**: Added `restore.invalid_path` translation key for security validation

### Fixed

- **Documentation**: Corrected test count references (100 → 179) across AGENTS.md, CONTRIBUTING.md, CHANGELOG.md
- **Documentation**: Updated AGENTS.md last updated date and test file organization
- **Documentation**: Added i18n technical details to CONTRIBUTING.md
- **Linting**: Fixed template literal issue in `isValidBackupPath()`
- **CHANGELOG**: Added missing version compare links for [0.5.0] and [0.6.0]

## [0.6.0] - 2026-04-19

### Added

- **Documentation i18n**: Restructured docs into `docs/en-US/` with full localization support
- **Runtime i18n**: Complete ICU MessageFormat implementation for all UI strings
- **Type-safe translations**: 74 translation keys with full TypeScript autocomplete
- **Locale detection**: Auto-detects locale from `~/.pi/agent/settings.json`
- **Translation tests**: 154 tests validating all translation keys are valid and used
- **Contributing guide**: New translation contribution workflow in `docs/en-US/CONTRIBUTING.md`
- **Zero dependencies**: Custom ~2KB i18n engine, no external libraries needed

## [0.5.0] - 2026-04-18

### Added

- **Dev Mode Helpers**: Add `just dev-mode`, `just user-mode`, and `just dev-status` commands for easier local development workflow
- Self-exclusion test coverage for `pi-pkg-guard` package detection

### Fixed

- Prevent `pi-pkg-guard` from detecting itself as an orphaned package when running in dev mode via symlink

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
- Comprehensive test suite with 179 test cases covering type guards, package analysis, regex patterns, gist utilities, and i18n validation
- Type-safe TypeScript implementation with proper interfaces and type guards

### Technical Details

- Uses Pi Extension API (`ExtensionAPI`) for seamless integration
- Namespaced status key: `ext:pi-pkg-guard:v1`
- Silent failure mode for non-critical operations (never blocks pi)
- 1-hour debounce on startup checks to avoid excessive npm list calls

[Unreleased]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.4.9...v0.5.0
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
