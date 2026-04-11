# Agent Guidelines: pi-pkg-guard

**Scope:** Pi extension development and maintenance  
**Last Updated:** 2026-04-11  
**Version:** 1.0

---

## Communication Style

- Be direct and concise in technical discussions
- When suggesting changes, explain the "why" behind recommendations
- Flag any security implications immediately
- Ask clarifying questions if requirements are ambiguous

---

## Code Conventions

### TypeScript Standards

- **Always use TypeScript** for all source files
- Use strict type checking - avoid `any` types
- Define interfaces for all data structures (PackageDiff, PiSettings, etc.)
- Use type guards for runtime validation (isPiSettings, isBashToolInput)

### Code Organization

```typescript
// Follow this structure in extensions/index.ts:
// 1. Constants (STATUS_KEY, CHECK_INTERVAL_MS)
// 2. Types (interfaces and type definitions)
// 3. Type Guards (runtime validation functions)
// 4. Core Functions (grouped by purpose)
// 5. Extension Entry Point (export default function)
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Constants | UPPER_SNAKE_CASE | `STATUS_KEY`, `CORE_PACKAGE` |
| Functions | camelCase | `analyzePackages()`, `syncOrphanedPackages()` |
| Interfaces | PascalCase | `PackageDiff`, `PiSettings` |
| Type Guards | is + TypeName | `isPiSettings()`, `isBashToolInput()` |

---

## Testing Requirements

### Mandatory Test Coverage

**ALWAYS run tests before committing:**

```bash
just test
# or
npm test
```

### Test Standards

- All type guards must have comprehensive test coverage
- Test both good cases and edge cases
- Test error conditions (null, undefined, invalid types)
- Use descriptive test names: "should detect X when Y"

### Test File Organization

```
test/
├── guards.test.ts      # Type guard tests
├── analysis.test.ts     # Package analysis tests  
└── regex.test.ts        # Pattern matching tests
```

---

## Tool Usage Patterns

### When Working with Pi Extension API

```typescript
// ✅ DO: Use proper event handlers
pi.on("session_start", async (event, ctx) => {
  if (event.reason !== "startup") return;
  // ...
});

// ✅ DO: Set status with namespace
ctx.ui.setStatus(STATUS_KEY, "message");

// ✅ DO: Use notifications for warnings
ctx.ui.notify("message", "warning");

// ✅ DO: Register commands with clear names
pi.registerCommand("pi-pkg-guard", {
  description: "Clear description of what this does",
  handler: async (_args, ctx) => { /* ... */ }
});
```

### File Operations

```typescript
// ✅ DO: Always wrap file operations in try-catch
function readPiSettings(): PiSettings {
  try {
    const content = readFileSync(SETTINGS_PATH, "utf-8");
    // ...
  } catch {
    return {}; // Fail silently for non-critical ops
  }
}
```

---

## Workflow Rules

### Before Making Changes

1. **Read the relevant code first** - Understand existing patterns
2. **Check for similar implementations** - Follow established conventions
3. **Identify test impact** - Will existing tests need updates?

### When Making Changes

1. **Edit precisely** - Use Edit tool for targeted changes
2. **Update tests** - Add/modify tests for new behavior
3. **Run full test suite** - All 100 tests must pass
4. **Run linting** - Ensure code style compliance:
   ```bash
   just check
   # or
   npx @biomejs/biome check .
   ```

### Before Committing

1. **Verify test coverage** - Run `npm test`
2. **Check code style** - Run `just format` if needed
3. **Review type safety** - Ensure no TypeScript errors
4. **Test the extension locally** - Install and verify in pi

---

## Release Process

### Version Bump Checklist

When preparing a release:

1. Update version in `package.json`
2. Add entry to `CHANGELOG.md`
3. Run full test suite
4. Run `npm publish --dry-run` to verify package contents
5. Tag release on GitHub after publishing

### NPM Publishing

```bash
# Verify before publishing
npm publish --dry-run

# Publish to npm
npm publish --access public
```

### Post-Publication

1. Create GitHub release with notes
2. Verify installation works: `pi install npm:pi-pkg-guard`
3. Monitor for issues

---

## Security Considerations

### File System Access

- Settings file path: `~/.pi/agent/settings.json`
- Always validate paths before file operations
- Fail silently for non-critical operations (non-blocking)

### Command Detection

```typescript
// ✅ DO: Use precise regex patterns
const NPM_GLOBAL_PATTERN = /npm\s+(install|i)\s+.*(-g|--global)/;
const PI_PACKAGE_PATTERN = /pi-[\w-]+/;

// ✅ DO: Validate input before processing
function isBashToolInput(input: unknown): input is { command?: string } {
  return typeof input === "object" && input !== null;
}
```

### Sensitive Data

- Never log or expose settings.json contents
- Don't capture npm authentication details
- Respect user privacy in all operations

---

## Common Tasks

### Adding a New Feature

1. Define the feature and its purpose
2. Add type definitions if needed
3. Implement the feature
4. Add comprehensive tests
5. Update README.md with documentation
6. Run full test suite

### Fixing a Bug

1. Write a test that reproduces the bug
2. Fix the implementation
3. Verify test passes
4. Check for regressions (run all tests)
5. Update CHANGELOG.md

### Updating Dependencies

- Ask before adding new dependencies
- Prefer peerDependencies for pi-related packages
- Verify compatibility with Node.js >= 18

---

## Decision Making

### When to Ask vs. Proceed

| Scenario | Action |
|----------|--------|
| Changing extension API usage | Ask first |
| Adding new dependencies | Ask first |
| Modifying core detection logic | Ask first |
| Refactoring type guards | Proceed, then verify tests |
| Adding tests | Proceed |
| Documentation updates | Proceed |
| Bug fixes with clear solution | Proceed |

### Priority Guidelines

1. **Safety first** - Never risk corrupting user settings.json
2. **Test coverage** - New code must have tests
3. **Backward compatibility** - Avoid breaking existing users
4. **Simplicity** - Prefer simple solutions over complex ones

---

## Reference: Key Files

| File | Purpose |
|------|---------|
| `extensions/index.ts` | Main extension code |
| `package.json` | NPM configuration |
| `README.md` | User documentation |
| `CHANGELOG.md` | Version history |
| `test/*.test.ts` | Test suites |
| `justfile` | Task runner commands |
| `biome.json` | Linting configuration |

---

## Reference: Useful Commands

```bash
# Development
just test              # Run all tests
just check             # Run all checks (format, lint, test, typecheck)
just fix               # Fix auto-fixable issues
just typecheck         # TypeScript type checking

# NPM
npm publish --dry-run  # Preview package contents
npm pack               # Create tarball for inspection
```

---

*These guidelines help maintain code quality and consistency. Update this file when workflows change.*
