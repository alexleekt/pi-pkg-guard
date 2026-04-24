# Architecture Documentation

> Technical architecture & design decisions

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     pi coding agent                       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Extension  │   │   Extension  │   │   Extension  │ │
│  │  pi-pkg-guard│   │    Other     │   │    Other     │ │
│  └──────┬───────┘   └──────────────┘   └──────────────┘ │
│         │                                               │
│  ┌──────▼──────────────────────────────────────────────┐ │
│  │                  pi Extension API                  │ │
│  │  • Event handlers (session_start, before_tool)     │ │
│  │  • Command registration                          │ │
│  │  • UI context (widgets, menus, notifications)    │ │
│  └──────┬─────────────────────────────────────────────┘ │
│         │                                               │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                      System Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │   npm    │  │ settings │  │  files   │  │  GitHub  ││
│  │  list -g │  │   json   │  │  backup  │  │   Gist   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
extensions/
├── index.ts              # Main extension (1068 lines)
│   ├── Constants & Types       # L24-90
│   ├── Type Guards             # L93-195
│   ├── Gist Utilities          # L133-195
│   ├── NPM Operations          # L198-237
│   ├── Settings Operations     # L240-309
│   ├── Package Analysis        # L312-368
│   ├── Backup Operations       # L371-447
│   ├── GitHub Gist Operations  # L398-585
│   ├── Command Handlers        # L588-865
│   └── Extension Entry Point   # L868-1068
│
└── i18n/
    ├── index.ts          # i18n engine (formatMessage, t)
    ├── en-US.ts          # English translations
    ├── es-ES.ts          # Spanish translations
    └── types.ts          # TypeScript definitions
```

---

## Key Design Decisions

### 1. NPM Cache with TTL

**Problem:** Repeated `npm list -g` calls are slow and expensive  
**Solution:** In-memory cache with 5-second TTL

```typescript
let npmCache: { data: string[]; timestamp: number } | null = null;
const NPM_CACHE_TTL = 5000; // 5 seconds

function getNpmGlobalPackages(): string[] {
  if (npmCache && Date.now() - npmCache.timestamp < NPM_CACHE_TTL) {
    return npmCache.data;
  }
  // ... fetch from npm
}
```

**Impact:** Menu operations feel instant during interactive use.

---

### 2. Debounced Startup Check

**Problem:** Don't want to check npm on every session  
**Solution:** Check at most once per hour

```typescript
const CHECK_INTERVAL_MS = 3600000; // 1 hour

pi.on("session_start", async (event, ctx) => {
  if (event.reason !== "startup") return;
  // Only check if last check was > 1 hour ago
});
```

**Impact:** Balances timely warnings with performance.

---

### 3. Type Guards for Runtime Safety

**Problem:** External data (settings, gist responses) may be malformed  
**Solution:** Runtime type validation

```typescript
function isPiSettings(value: unknown): value is PiSettings {
  return typeof value === "object" && 
         value !== null &&
         "packages" in value &&
         Array.isArray(value.packages);
}
```

**Impact:** Graceful degradation instead of crashes.

---

### 4. Zone-Based UI Architecture

**Problem:** Complex menus with mixed interactive and display elements  
**Solution:** Three distinct zones

| Zone | API | Purpose |
|------|-----|---------|
| Status | `ctx.ui.setWidget()` | Non-selectable display |
| Menu | `ctx.ui.select()` | Interactive navigation |
| Content | `console.log()` | Historical transcript |

**Impact:** Clear separation of concerns, intuitive UX.

---

### 5. Custom ICU MessageFormat Parser

**Problem:** Need pluralization without heavy dependencies  
**Solution:** Single-pass O(n) parser

**Features:**
- Variable interpolation
- Pluralization (one/other)
- Select expressions
- Nested expressions

**Impact:** 200 LOC vs 10KB+ library, full i18n support.

---

## Data Flow

### Startup Detection Flow

```
pi starts
    │
    ▼
session_start event
    │
    ▼
analyzePackages()
    ├─► getNpmGlobalPackages() ──► npm list -g
    ├─► getRegisteredPackages() ──► read settings.json
    │
    ▼
Compare lists
    │
    ▼
unregistered packages found?
    ├─► Yes: ctx.ui.setStatus(warning)
    └─► No: clear status
```

### Menu Flow

```
/package-guard command
    │
    ▼
pi.registerCommand handler
    │
    ▼
While loop (menu loop)
    │
    ├─► analyzePackages() ──► fresh data
    ├─► ctx.ui.setWidget(status) ──► show status
    ├─► buildMenuOptions() ──► contextual items
    ├─► ctx.ui.select(menu) ──► user choice
    │       │
    │       ▼
    │   handleChoice()
    │       │
    │       ▼
    │   execute action
    │       │
    │       ▼
    │   log result to transcript
    │
    ◄───── loop (refresh)
```

---

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| NPM list (cold) | ~500ms | Initial fetch |
| NPM list (cached) | ~1ms | Within 5s TTL |
| Settings read | ~5ms | Small JSON file |
| Gist sync | ~2s | Network dependent |
| Menu render | ~10ms | Local only |

---

## Security Boundaries

| Boundary | Enforcement |
|----------|-------------|
| Gist ID | Hexadecimal regex pattern |
| Backup path | Directory prefix matching |
| Shell execution | execAsync with timeouts |
| File reading | try/catch fallbacks |

---

*[← Back to Reference](./README.md)*
