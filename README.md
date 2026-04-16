# pi-pkg-guard

A lightweight pi extension that guards against the "orphaned package" trap where packages are installed via npm but not registered in pi's `settings.json`.

## The Problem

When you install pi extensions via npm directly, they become "orphaned" - installed on your system but unknown to pi:

```bash
npm install -g pi-token-burden  # Installs to npm global
# But pi doesn't know about it! Must also add to settings.json
```

This extension provides **passive guardrails** to prevent and fix this issue.

## Features

| Feature | Behavior |
|---------|----------|
| **Startup Check** | Status line warning if orphaned packages detected (max once/hour) |
| **`/pi-pkg-guard`** | One-liner to auto-register orphaned packages |
| **npm Guard** | Warns when bash tool runs `npm install -g pi-*` |

## Installation

### Via pi (Recommended)

```bash
pi install npm:pi-pkg-guard
```

### Via npm

```bash
npm install -g pi-pkg-guard
# Then add to ~/.pi/agent/settings.json:
# {
#   "packages": ["npm:pi-pkg-guard"]
# }
```

### Manual (Development)

```bash
# Clone the repository
git clone https://github.com/alexleekt/pi-pkg-guard.git

# Symlink to pi extensions directory
ln -s $(pwd)/pi-pkg-guard ~/.pi/agent/extensions/pi-pkg-guard

# Or add to settings.json
# {
#   "extensions": ["/path/to/pi-pkg-guard"]
# }
```

Then `/reload` in pi.

## Usage

### Check for Orphaned Packages

Run the slash command to check and fix:

```
/pi-pkg-guard
```

**Outputs:**
- `✅ All pi packages registered` - No orphaned packages found
- `✅ Registered N package(s). Run /reload.` - Fixed! Run `/reload` to activate

### Automatic Startup Check

On pi startup, the extension checks for orphaned packages (max once per hour). If found, you'll see:

```
⚠️ 3 orphaned pi package(s). Run /pi-pkg-guard
```

### npm Install Guard

When a tool attempts `npm install -g pi-*`, you'll see:

```
⚠️ Use 'pi install npm:pi-foo' instead of 'npm install -g'
```

## How It Works

1. **Detects** packages matching patterns:
   - `pi-*` prefix (e.g., `pi-foo`)
   - `*-pi` suffix (e.g., `lsp-pi`) 
   - `@scope/pi-*` scoped packages (e.g., `@scope/pi-foo`)
2. **Validates** via `package.json` keywords (`pi-coding-agent`, `pi-extension`, `pi-package`)
3. **Compares** npm global packages against `settings.json` registered packages
4. **Normalizes** both `pi-foo` and `npm:pi-foo` formats
5. **Excludes** the core package `@mariozechner/pi-coding-agent`

## Compatibility

- **Node.js**: >= 18.0.0
- **pi**: Works with all versions supporting `ExtensionAPI`

## Related Extensions

- **[pi-extmgr](https://pi.dev/packages/pi-extmgr)** (`/extensions`) - Full package management UI. This extension provides passive guardrails that complement pi-extmgr.
- **[pi-extension-manager](https://pi.dev/packages/pi-extension-manager)** - Interactive extension manager

## Why Not Just Use pi-extmgr?

`pi-extmgr` provides a full UI for managing extensions. `pi-pkg-guard` provides **passive guardrails** - it watches and warns automatically without requiring you to open a UI. Use both together:

- `pi-pkg-guard` for automatic detection and warnings
- `pi-extmgr` for interactive browsing and management

## Development

```bash
# Clone
git clone https://github.com/alexleekt/pi-pkg-guard.git
cd pi-pkg-guard

# Install dependencies
npm install

# Run tests
just test

# Run all checks
just check

# Link for development
ln -s $(pwd) ~/.pi/agent/extensions/pi-pkg-guard

# Test in pi
pi
# Then /reload
```

See all available tasks: `just --list`

## Releasing

This project uses **GitHub Actions** with **Trusted Publishing** (OIDC) - the modern, secure way to publish to npm without long-lived tokens.

### Setup (One-Time)

**Configure Trusted Publisher on npm:**

1. Go to [npmjs.com/package/pi-pkg-guard](https://www.npmjs.com/package/pi-pkg-guard) → "Publish Settings" or "Access"
2. Click "Add Trusted Publisher"
3. Configure:
   - **Provider**: GitHub Actions
   - **Owner**: `alexleekt`
   - **Repository**: `pi-pkg-guard`
   - **Workflow**: `publish.yml` (or leave as `*` for any workflow)
   - **Environment**: (optional) leave empty or set to `production`

**How it works:**
- No `NPM_TOKEN` secret needed in GitHub
- GitHub Actions authenticates via OIDC directly with npm
- Short-lived tokens are generated automatically for each publish
- More secure than long-lived API tokens

### Creating a Release

**Option 1: Using just (Recommended)**

```bash
# Auto-detect version from package.json
just release

# Or specify version explicitly
just release 0.3.0
```

This creates and pushes a git tag, which triggers the publish workflow.

**Option 2: Manual**

```bash
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin v0.3.0
```

### What Happens Automatically

GitHub Actions will:
1. ✅ Run all checks (biome, tests, typecheck)
2. ✅ Publish to npm with **provenance** (links package to GitHub source)
3. ✅ Create GitHub Release with auto-generated notes

Monitor at: [Actions tab](https://github.com/alexleekt/pi-pkg-guard/actions)

**Note:** You don't need to manually create a GitHub Release - it's done automatically when you push the tag.

### Fallback: Token-Based Publishing

If Trusted Publishing isn't available for your npm plan, you can use a classic token:
1. Create an **automation token** at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Add it to GitHub Secrets as `NPM_TOKEN`
3. Uncomment the `NODE_AUTH_TOKEN` line in `.github/workflows/publish.yml`

## License

MIT © Alex Lee

## Contributing

Issues and PRs welcome at [github.com/alexleekt/pi-pkg-guard](https://github.com/alexleekt/pi-pkg-guard)
