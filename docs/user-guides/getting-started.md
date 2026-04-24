# Getting Started with pi-pkg-guard

> Quick start tutorial for new users

---

## What You'll Learn

- What unregistered packages are
- How to check for them
- How to fix them
- How to prevent them

---

## Prerequisites

- [pi coding agent](https://github.com/mariozechner/pi) installed
- Node.js >= 18.0.0
- npm (comes with Node.js)

---

## Installation (30 seconds)

```bash
pi install npm:pi-pkg-guard
```

That's it! The extension is now installed and active.

---

## Your First Scan

1. **Start pi** (if not already running)
2. **Run the package-guard command:**
   ```
   /package-guard
   ```

3. **Select "Find unregistered packages"** from the menu

You'll see one of two results:

### ✅ No unregistered packages Found
```
✓ All pi packages are registered. No unregistered packages found.
```

### ⚠️ unregistered packages Detected
```
✓ Registered 3 unregistered package(s) with pi:
  - pi-token-burden
  - pi-timer
  - pi-backup

Run /reload to activate packages
```

---

## What Are Unregistered Packages?

An **unregistered package** is a pi extension installed via npm but not registered in pi's settings.

### The Problem

```bash
# You run this in your terminal:
npm install -g pi-token-burden

# It installs successfully, but...
# pi doesn't know about it!
```

Result: The package exists on your system, but pi can't use it.

### The Solution

pi-pkg-guard detects these unregistered packages and helps you register them:

1. **Automatic detection** on pi startup
2. **Manual scan** via `/package-guard`
3. **Prevention** by warning when you use `npm install -g pi-*`

### ✅ Scan After Manual npm Installs

If you must use npm directly:

```
/package-guard → Scan
```

---

## Best Practices

### ✅ Always Use `pi install`

```bash
# ✅ Good - pi knows about it
pi install npm:pi-foo

# ❌ Avoid - creates unregistered package
npm install -g pi-foo
```

### ✅ Scan After Manual npm Installs

If you must use npm directly:

```
/package-guard → Find unregistered packages
```

### ✅ Create Your First Backup

```
/package-guard → Save backup to file + Gist
```

This creates a recovery point for your extension setup.

### ✅ Set Up GitHub Gist (Multi-Machine Users)

1. Install GitHub CLI: `brew install gh`
2. Login: `gh auth login`
3. In pi: `/package-guard → Set up new GitHub Gist backup`

Now your backup syncs to the cloud!

---

## Next Steps

| Action | Guide |
|--------|-------|
| Learn all features | [Usage Guide](./usage.md) |
| Detailed install options | [Installation Guide](./installation.md) |
| Backup best practices | [Backup Strategies](./backup-restore.md) |
| Use across multiple machines | [Multi-Machine Setup](./multi-machine-setup.md) |
| Fix common issues | [Troubleshooting](./troubleshooting.md) |

---

## Quick Command Reference

| Command | Action |
|---------|--------|
| `/package-guard` | Open main menu |
| `pi install npm:pi-*` | Install package correctly |
| `/reload` | Reload pi after registering packages |

---

*[← Back to User Guides](./README.md)*
