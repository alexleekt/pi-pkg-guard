# pi-pkg-guard

> Guards against orphaned pi packages — installed via npm but not registered in pi's settings.

[![npm version](https://badge.fury.io/js/pi-pkg-guard.svg)](https://www.npmjs.com/package/pi-pkg-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start

```bash
pi install npm:pi-pkg-guard
```

Then in pi: `/package-guard`

---

## The Problem

```bash
npm install -g pi-token-burden  # Installs to npm global
# But pi doesn't know about it!
```

**pi-pkg-guard** detects, warns, and fixes this automatically.

---

## Features

- **Startup check** — Warns if orphaned packages found
- **npm guard** — Warns when you run `npm install -g pi-*`
- **Scan** — Find and register orphaned packages
- **Backup** — Save to local file + optional GitHub Gist
- **Restore** — Recover packages from backup

---

## Documentation

📚 **[View Documentation](docs/README.md)** — Complete documentation index

**Quick Links:**
- [Getting Started](docs/user-guides/getting-started.md) — First time users
- [Installation](docs/user-guides/installation.md) — Install options
- [Usage Guide](docs/user-guides/usage.md) — Feature guide
- [Contributing](docs/development/contributing.md) — Developer guide

**Reference:**
- [Architecture](docs/reference/architecture.md)
- [API](docs/reference/api.md)
- [Security Model](docs/reference/security.md)

---

## Passive Warnings

**Startup:** `3 orphaned pi package(s). Run /package-guard`

**npm install:** `Use 'pi install npm:pi-foo' instead of 'npm install -g'`

---

## Development

```bash
git clone https://github.com/alexleekt/pi-pkg-guard.git
cd pi-pkg-guard
npm install

just test      # Run tests
just check     # Run all checks
just release   # Create release
```

See [Contributing Guide](docs/development/contributing.md) for details.

---

## Release Process

This project uses **GitHub Actions with Trusted Publishing** (OIDC) for automated npm releases:

```bash
just release        # Auto-detects version from package.json
```

See full details in [Release Process](docs/development/release-process.md).

---

## License

MIT © Alex Lee
