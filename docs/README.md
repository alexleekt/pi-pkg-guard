# pi-pkg-guard Documentation

> Guards against unregistered pi packages — installed via npm but not registered in pi's settings.

---

## Quick Start

```bash
pi install npm:pi-pkg-guard
```

Then in pi: `/package-guard`

---

## Documentation Map

### For Users

| Document | Description |
|----------|-------------|
| [Getting Started](./user-guides/getting-started.md) | Quick start tutorial |
| [Installation](./user-guides/installation.md) | Detailed installation options |
| [Usage Guide](./user-guides/usage.md) | Complete feature guide |
| [Backup Strategies](./user-guides/backup-strategies.md) | Best practices for backups |
| [Multi-Machine Setup](./user-guides/multi-machine-setup.md) | Using Gist across devices |
| [Troubleshooting](./user-guides/troubleshooting.md) | Common issues & solutions |

### For Contributors

| Document | Description |
|----------|-------------|
| [Development Setup](./development/setup.md) | Dev environment setup |
| [Contributing](./development/contributing.md) | Contribution guidelines |
| [Testing Guide](./development/testing.md) | Test writing guide |
| [Release Process](./development/release-process.md) | Release workflow |

### Reference

| Document | Description |
|----------|-------------|
| [API Reference](./reference/api.md) | Extension API documentation |
| [Configuration](./reference/configuration.md) | Config options reference |
| [Security Model](./reference/security.md) | Security validations |
| [i18n Guide](./reference/i18n-guide.md) | Translation contributor guide |
| [Architecture](./reference/architecture.md) | Technical architecture |

### Epics (Feature Documentation)

| Epic | Description |
|------|-------------|
| [Epic 1: Detection & Prevention](./epics/epic-01-detection/) | Unregistered detection and npm guard |
| [Epic 2: Package Management](./epics/epic-02-management/) | Scan and restore features |
| [Epic 3: Backup & Recovery](./epics/epic-03-backup/) | Local and Gist backup |
| [Epic 4: Configuration](./epics/epic-04-config/) | Settings and persistence |
| [Epic 5: User Experience](./epics/epic-05-ux/) | UI/UX and i18n |

---

## Features at a Glance

- **Startup Check** — Warns if unregistered packages found (debounced to once/hour)
- **NPM Guard** — Warns when you run `npm install -g pi-*`
- **Scan & Sync** — Find and register unregistered packages automatically
- **Backup** — Save to local file + optional GitHub Gist
- **Restore** — Selectively restore packages from backup

---

## What Are unregistered packages?

An **unregistered package** is a pi extension installed via npm but not registered in pi's settings.

```bash
npm install -g pi-token-burden  # Installs to npm global
# But pi doesn't know about it!
```

pi-pkg-guard detects, warns, and fixes this automatically.

---

## Project Structure

```
docs/
├── README.md                    # This file - documentation index
├── epics/                       # Feature-domain organization
│   ├── epic-01-detection/       # Unregistered detection & prevention
│   ├── epic-02-management/      # Scan & restore features
│   ├── epic-03-backup/          # Backup & recovery
│   ├── epic-04-config/          # Configuration management
│   └── epic-05-ux/              # UI/UX & i18n
├── user-guides/                 # Task-oriented guides
│   ├── getting-started.md
│   ├── installation.md
│   ├── usage.md
│   ├── backup-strategies.md
│   ├── multi-machine-setup.md
│   └── troubleshooting.md
├── reference/                   # Technical reference
│   ├── api.md
│   ├── configuration.md
│   ├── security.md
│   ├── i18n-guide.md
│   └── architecture.md
├── development/                 # Contributor docs
│   ├── setup.md
│   ├── contributing.md
│   ├── testing.md
│   └── release-process.md
├── archive/                     # Deprecated content
│   └── 2026-04-backup/          # Original docs backup
└── translations/                # i18n templates
    └── template/
```

---

## Contributing

See [Contributing Guide](./development/contributing.md) for details.

---

*[← Back to Project Root](../README.md)*
