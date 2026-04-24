# Configuration Reference

> Config options reference

---

## Settings Location

Configuration is stored in pi's settings file:

```
~/.pi/agent/settings.json
```

Under the `pi-pkg-guard` key:

```json
{
  "packages": [...],
  "pi-pkg-guard": {
    "backupPath": "~/.pi/agent/package-guard-backup.json",
    "gistId": "abc123...",
    "gistAutoSync": true
  }
}
```

---

## Configuration Options

### backupPath

**Type:** `string`  
**Default:** `"~/.pi/agent/package-guard-backup.json"`  
**Description:** Path to local backup file

**Constraints:**
- Must be within `~/.pi/agent/` or temp directory
- `~` is automatically expanded to `$HOME`

**Example:**
```json
{
  "backupPath": "~/.pi/agent/my-backup.json"
}
```

---

### gistId

**Type:** `string`  
**Default:** `undefined`  
**Description:** GitHub Gist ID for cloud backup

**Constraints:**
- Must be 32+ hexadecimal characters
- Used for Gist sync operations

**Example:**
```json
{
  "gistId": "abc123def456789012345678901234567890abcd"
}
```

---

### gistAutoSync

**Type:** `boolean`  
**Default:** `true`  
**Description:** Automatically sync backups to Gist

**Behavior:**
- When `true`: Every local backup also syncs to Gist
- When `false`: Only local backup is created

**Example:**
```json
{
  "gistAutoSync": true
}
```

---

## Changing Configuration

### Via Menu Interface

```
/package-guard → Change where backups are saved
/package-guard → Set up new GitHub Gist backup
/package-guard → Enable/Disable Gist auto-sync
```

### Manual Edit

Edit `~/.pi/agent/settings.json`:

```bash
# Using your preferred editor
vim ~/.pi/agent/settings.json
```

**Important:** Ensure valid JSON syntax. Invalid config will be ignored.

---

*[← Back to Reference](./README.md)*
