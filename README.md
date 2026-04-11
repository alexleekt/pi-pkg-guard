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
git clone https://github.com/alexleekt/pi-extensions.git

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

1. **Detects** packages starting with `pi-` or scoped packages containing `/pi-`
2. **Compares** npm global packages against `settings.json` registered packages
3. **Normalizes** both `pi-foo` and `npm:pi-foo` formats
4. **Excludes** the core package `@mariozechner/pi-coding-agent`

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
git clone https://github.com/alexleekt/pi-extensions.git
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

```bash
# Clone
git clone https://github.com/alexleekt/pi-extensions.git
cd pi-pkg-guard

# Link for development
ln -s $(pwd) ~/.pi/agent/extensions/pi-pkg-guard

# Test in pi
pi
# Then /reload
```

## License

MIT © Alex Lee

## Contributing

Issues and PRs welcome at [github.com/alexleekt/pi-extensions](https://github.com/alexleekt/pi-extensions)
