# i18n System for pi-pkg-guard

Internationalization system with ICU MessageFormat support for the pi-pkg-guard extension.

---

## Supported Languages

| Locale | Language | Status | File |
|--------|----------|--------|------|
| `en-US` | English (United States) | ✅ Default | `en-US.ts` |

---

## Adding a New Language

### 1. Create Translation File

Create a new file: `extensions/i18n/{locale}.ts`

```typescript
import type { TranslationDict } from "./types.js";

export const es_ES: TranslationDict = {
  "status.orphaned_packages": "{count, plural, one {Paquete huérfano} other {Paquetes huérfanos}}...",
  // ... all other keys
};
```

### 2. Register the Locale

Add to `extensions/i18n/index.ts`:

```typescript
import { es_ES } from "./es-ES.js";

// Register the locale
translations.set("es-ES", es_ES);
```

### 3. Update Documentation

Add to the language table in `docs/en-US/CONTRIBUTING.md`.

---

## ICU MessageFormat Syntax

### Simple Interpolation

```typescript
"hello": "Hello, {name}!"

t("hello", { name: "World" })
// "Hello, World!"
```

### Plurals

```typescript
"items": "{count, plural, one {# item} other {# items}}"

t("items", { count: 1 })  // "1 item"
t("items", { count: 5 })  // "5 items"
```

### Select/Choice

```typescript
"gender": "{gender, select, male {he} female {she} other {they}}"

t("gender", { gender: "male" })    // "he"
t("gender", { gender: "unknown" }) // "they"
```

---

## Translation Keys Reference

See `types.ts` for the complete list of translation keys.

### Categories

- `status.*` - Status messages
- `npm_guard.*` - npm guard warnings
- `menu.*` - Command menu
- `scan.*` - Scan/Run operations
- `backup.*` - Backup operations
- `restore.*` - Restore operations
- `config.*` - Settings/Configuration
- `help.*` - Help text

---

## Best Practices

1. **Use named placeholders**: `{name}` not `{0}`
2. **Keep sentences complete**: Don't split strings for concatenation
3. **Use ICU for plurals**: Different languages have different plural rules
4. **Provide context**: Use `select` for conditional text
5. **Test with real data**: Verify plural forms in your language

---

*For more information, see [ICU MessageFormat documentation](https://unicode-org.github.io/icu/userguide/format_parse/messages/).*
