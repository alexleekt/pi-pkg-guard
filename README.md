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
just release   # Create release (see Release Process below)
```

## Release Process

This project uses **GitHub Actions with Trusted Publishing** (OIDC) for automated npm releases:

1. **Trusted Publishing Setup** (one-time):
   - Go to https://www.npmjs.com/package/pi-pkg-guard → Settings → Trusted Publisher
   - Configure: GitHub Actions, Owner=`alexleekt`, Repository=`pi-pkg-guard`, Workflow=`publish.yml`

2. **Creating a Release**:
   ```bash
   just release        # Auto-detects version from package.json
   # or manually:
   git tag -a v0.X.Y -m "Release v0.X.Y"
   git push origin v0.X.Y
   ```

3. **What Happens**:
   - GitHub Actions runs checks (biome, tests, typecheck)
   - Publishes to npm with provenance (OIDC - no token needed)
   - Creates GitHub Release with auto-generated notes

### CI/CD Debugging Lessons

**⚠️ Important**: If the CI workflow fails, don't create multiple version bumps to debug it.

**Wrong approach** (what we did for v0.4.x):
```bash
# ❌ DON'T: 10 patch releases just for CI fixes
git tag v0.4.1 && git push  # fix 1
git tag v0.4.2 && git push  # fix 2
# ... 8 more times ...
```

**Right approach** for future:
- Use `workflow_dispatch` (manual trigger) to test workflow changes
- Or push commits to main without tagging, then tag once it works
- CI fixes don't need version bumps unless they fix user-facing delivery

### Key Technical Details

- **Node.js 24** required for npm Trusted Publishing (not 22 - has buggy support)
- **Permissions**: `id-token: write` (OIDC), `contents: write` (releases)
- **No npm token needed**: OIDC handles authentication automatically
- **Provenance**: Automatic with Trusted Publishing (no `--provenance` flag needed)

## License

MIT © Alex Lee
