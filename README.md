# pi-pkg-guard

Guards against orphaned pi packages - installed via npm but not registered in pi's settings.

## The Problem

```bash
npm install -g pi-token-burden  # Installs to npm global
# But pi doesn't know about it!
```

**pi-pkg-guard** detects, warns, and fixes this automatically.

## Quick Start

```bash
pi install npm:pi-pkg-guard
```

Then in pi: `/package-guard`

## Features

- **Startup check** - Warns if orphaned packages found
- **npm guard** - Warns when you run `npm install -g pi-*`
- **Scan** - Find and register orphaned packages
- **Backup** - Save to local file + optional GitHub Gist
- **Restore** - Recover packages from backup

## Using /package-guard

Run `/package-guard` for the main menu:

| Option | Description |
|--------|-------------|
| **Scan** | Find and register orphaned packages |
| **Backup** | Save to `~/.pi/agent/package-guard-backup.json` + Gist |
| **Restore** | Selectively restore from backup |
| **Settings** | Configure backup path and Gist sync |

### Gist Setup

1. Install [GitHub CLI](https://cli.github.com): `brew install gh`
2. Authenticate: `gh auth login`
3. In pi: `/package-guard` → Settings → "Create new GitHub Gist"

## Passive Warnings

**Startup:** `3 orphaned pi package(s). Run /package-guard`

**npm install:** `Use 'pi install npm:pi-foo' instead of 'npm install -g'`

## Installation

**Via pi:**
```bash
pi install npm:pi-pkg-guard
```

**Via npm:**
```bash
npm install -g pi-pkg-guard
# Add to ~/.pi/agent/settings.json: "packages": ["npm:pi-pkg-guard"]
```

**Manual:**
```bash
git clone https://github.com/alexleekt/pi-pkg-guard.git
ln -s $(pwd)/pi-pkg-guard ~/.pi/agent/extensions/pi-pkg-guard
```

## Development

```bash
git clone https://github.com/alexleekt/pi-pkg-guard.git
cd pi-pkg-guard
npm install

just test      # Run tests
just check     # Run all checks
just release   # Create release
```

## License

MIT © Alex Lee
