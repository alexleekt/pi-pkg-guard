# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Enhanced `isPiSettings()` type guard to validate `packages` and `extensions` arrays contain only strings
- Enhanced `isBashToolInput()` type guard to properly reject arrays
- Fixed GitHub repository URLs to point to correct `alexleekt/pi-pkg-guard` location
- Fixed biome.json configuration and template literal formatting

## [0.1.1] - 2026-04-12

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

[Unreleased]: https://github.com/alexleekt/pi-pkg-guard/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/alexleekt/pi-pkg-guard/releases/tag/v0.1.1
[0.1.0]: https://github.com/alexleekt/pi-pkg-guard/releases/tag/v0.1.0
