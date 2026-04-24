# Backup Strategies

> Best practices for backing up your pi package configuration

---

## Why Backup Matters

Your pi package configuration includes:
- All registered extensions
- Custom settings and preferences
- Gist sync configuration

Without a backup, losing this means manually reconfiguring pi on new machines or after data loss.

---

## Strategy 1: Local Backup Only

**Best for:** Single machine users who don't switch devices often.

### Setup

Default location is already configured:
```
~/.pi/agent/package-guard-backup.json
```

### Backup Command

```
/package-guard → Save backup to file + Gist
```

(This creates local backup even without Gist configured)

### Restore

```
/package-guard → Restore packages from backup
```

---

## Strategy 2: GitHub Gist Sync

**Best for:** Multi-machine users, developers who switch between work/personal machines.

### Prerequisites

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login
```

### Setup

```
/package-guard → Set up new GitHub Gist backup
```

### How It Works

1. Every backup syncs to your public GitHub Gist
2. Gist ID stored in local config
3. Accessible from any machine with GitHub access
4. Gist is public but only contains package names (no secrets)

### Multi-Machine Workflow

**Machine A (Work):**
```
/package-guard → Save backup to file + Gist
```

**Machine B (Home):**
```
/package-guard → Restore packages from backup
```

---

## Strategy 3: Version Controlled Backup

**Best for:** Teams, developers who want config in their dotfiles repo.

### Setup

1. Set custom backup path to your dotfiles:
   ```
   /package-guard → Change where backups are saved
   Enter: ~/.dotfiles/pi-packages.json
   ```

2. Add to version control:
   ```bash
   cd ~/.dotfiles
   git add pi-packages.json
   git commit -m "Add pi package backup"
   ```

### Benefits

- Version history of your package changes
- Synchronized across machines via git
- Auditable changes

---

## Recommended: Hybrid Approach

**Best of both worlds:**

1. **Local backup** for quick restores
2. **GitHub Gist** for multi-machine sync
3. **Optional:** Version control for dotfiles enthusiasts

---

## Backup Schedule

| When | Action |
|------|--------|
| After installing new package | Create backup |
| Weekly | Verify backup is current |
| Before major changes | Create backup |
| After config changes | Create backup |

---

## Security Considerations

### What's in the Backup

✅ **Included:**
- Package names (e.g., `npm:pi-token-burden`)
- Timestamp
- Registration status

❌ **Not Included:**
- API keys
- Tokens
- Personal data
- pi settings (except package-guard config)

### Gist Privacy

- Gists are **public** by default
- Only contains package names
- No sensitive information
- If concerned, use local backup only

---

## Troubleshooting Backups

### "Gist sync failed"

**Cause:** GitHub CLI not authenticated  
**Fix:** Run `gh auth login`

### "Invalid backup path"

**Cause:** Path outside allowed directories  
**Fix:** Use path within `~/.pi/agent/` or `/tmp/`

### "Backup file not found"

**Cause:** No backup created yet  
**Fix:** Run `/package-guard → Save backup to file + Gist`

---

*[← Back to User Guides](./README.md)*
