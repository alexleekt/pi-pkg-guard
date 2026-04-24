# API Reference

> Extension API documentation

---

## Extension Entry Point

```typescript
export default function (pi: PiApi) {
  // Event handlers
  pi.on("session_start", handler);
  pi.on("before_tool", handler);
  
  // Command registration
  pi.registerCommand("package-guard", commandConfig);
}
```

---

## Event Handlers

### Session Start

```typescript
pi.on("session_start", async (event, ctx) => {
  if (event.reason !== "startup") return;
  // Check for unregistered packages
});
```

**Triggered:** When pi starts  
**Purpose:** Detect unregistered packages and display warning

### Before Tool

```typescript
pi.on("before_tool", async (input, ctx) => {
  if (!isBashToolInput(input)) return;
  // Check for npm install -g pi-*
});
```

**Triggered:** Before any tool execution  
**Purpose:** Intercept npm install commands

---

## Commands

### Registering a Command

```typescript
pi.registerCommand("package-guard", {
  description: "Package management and backup",
  handler: async (_args, ctx) => {
    // Command implementation
  }
});
```

### UI Context Methods

```typescript
// Set status widget
ctx.ui.setWidget(key, content);

// Show notification
ctx.ui.notify(message, type);

// Display menu
const choice = await ctx.ui.select(title, options);

// Get user confirmation
const confirmed = await ctx.ui.confirm(message);

// Get text input
const input = await ctx.ui.textInput(prompt);
```

---

## Type Guards

### isPiSettings

```typescript
function isPiSettings(value: unknown): value is PiSettings {
  return typeof value === "object" && 
         value !== null &&
         "packages" in value &&
         Array.isArray(value.packages);
}
```

Validates pi settings.json structure.

### isBashToolInput

```typescript
function isBashToolInput(input: unknown): input is { command?: string } {
  return typeof input === "object" && 
         input !== null &&
         "command" in input;
}
```

Validates bash tool input for npm command detection.

### isExtensionSettings

```typescript
function isExtensionSettings(value: unknown): value is ExtensionSettings {
  return typeof value === "object" &&
         value !== null &&
         // ... additional checks
}
```

Validates pi-pkg-guard configuration object.

**Note:** Formerly `isGuardConfig()` (deprecated alias available).

---

## Backup Validation

### isPackageSnapshot

```typescript
function isPackageSnapshot(value: unknown): value is PackageSnapshot {
  // Validates all required fields and types
}
```

Type guard for backup data. Checks for required fields:
- `$schema` (string) - Schema URL
- `timestamp` (string) - ISO 8601 date
- `npmPackages` (string[]) - Global npm packages (canonical source)
- `excludedPackages` (string[], optional) - Packages excluded from registration prompts

**Note:** Formerly `isBackupData()` (deprecated alias available). The simplified schema stores only `npmPackages` - registration state is computed at restore time.

### validatePackageSnapshot

```typescript
function validatePackageSnapshot(data: unknown): ValidationResult {
  // Returns { valid: boolean, errors: string[] }
}
```

Strict validation with detailed error messages:
- Validates `$schema` URL against allowed patterns
- Checks ISO 8601 timestamp format
- Validates array element types
- Rejects unknown/additional properties

### isLegacyBackup

```typescript
function isLegacyBackup(data: unknown): boolean {
  // Detects backups without $schema field
}
```

Detects pre-schema backups (v0.8.2 and earlier) that need migration.

### migrateLegacyBackup

```typescript
function migrateLegacyBackup(data: unknown): MigrationResult {
  // Returns { migrated: boolean, data?: PackageSnapshot, errors?: string[] }
}
```

Migrates legacy backup format to current schema with `$schema` field.

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `STATUS_KEY` | `"ext:pi-pkg-guard:v1"` | Status widget key |
| `CHECK_INTERVAL_MS` | `3600000` | Debounce interval (1 hour) |
| `NPM_CACHE_TTL` | `5000` | NPM cache TTL (5 seconds) |
| `PI_NAME_PATTERN` | `/^pi-\|-pi$|\/pi-/` | Package name pattern |
| `PI_KEYWORDS` | `["pi-coding-agent", ...]` | Detection keywords |

---

## File Paths

| Path | Description |
|------|-------------|
| `~/.pi/agent/settings.json` | Pi settings file |
| `~/.pi/agent/package-guard-backup.json` | Default backup location |

---

*[← Back to Reference](./README.md)*
