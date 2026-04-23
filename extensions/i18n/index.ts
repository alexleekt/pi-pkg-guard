/**
 * i18n System for pi-pkg-guard
 *
 * Lightweight ICU MessageFormat implementation for TypeScript.
 * Supports interpolation, plurals, and select/case statements.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { en_US } from "./en-US.js";
import type {
	InterpolationValues,
	TranslationDict,
	TranslationKey,
} from "./types.js";

// Current locale and translations
let currentLocale = "en-US";
const translations: Map<string, Partial<TranslationDict>> = new Map([
	["en-US", en_US],
]);

/**
 * Parse ICU options (plural or select) from options string
 * Pattern: key {content} key2 {content2}
 * Handles nested braces within content.
 */
function parseIcuOptions(options: string): Record<string, string> {
	const forms: Record<string, string> = {};
	let idx = 0;

	while (idx < options.length) {
		// Skip whitespace
		while (idx < options.length && /\s/.test(options[idx])) {
			idx++;
		}

		if (idx >= options.length) break;

		// Read key (word characters, or =0, =1, etc. for explicit values)
		const keyMatch = options.slice(idx).match(/^(\w+|=[0-9]+)/);
		if (!keyMatch) break;

		const key = keyMatch[1];
		idx += keyMatch[0].length;

		// Skip whitespace before opening brace
		while (idx < options.length && /\s/.test(options[idx])) {
			idx++;
		}

		// Expect opening brace
		if (idx >= options.length || options[idx] !== "{") {
			break; // Malformed, stop parsing
		}
		idx++; // Skip opening brace

		// Extract content with nested brace handling
		let depth = 1;
		const contentStart = idx;

		while (idx < options.length && depth > 0) {
			const char = options[idx];
			if (char === "{") {
				depth++;
			} else if (char === "}") {
				depth--;
			}
			idx++;
		}

		if (depth === 0) {
			// Successfully found matching closing brace
			// idx now points past the closing brace, so content ends at idx - 1
			forms[key] = options.slice(contentStart, idx - 1);
		}
	}

	return forms;
}

// Aliases for semantic clarity
const parsePluralOptions = parseIcuOptions;
const parseSelectOptions = parseIcuOptions;

/**
 * Check if string at position matches ICU pattern start: {varName, plural/select,
 * Returns match array or null. Uses sticky flag for O(1) matching.
 */
const icuStartPattern = /\{(\w+),\s*(plural|select),\s*/y;

/**
 * Check for simple interpolation: {varName}
 * Uses sticky flag for O(1) matching.
 */
const simpleInterpPattern = /\{(\w+)\}/y;

/**
 * Parse and format an ICU MessageFormat string
 *
 * Supports:
 * - Simple interpolation: {name}
 * - Plural forms: {count, plural, one {# item} other {# items}}
 * - Select: {gender, select, male {he} female {she} other {they}}
 *
 * Performance: O(n) - single pass with no string slicing
 */
function formatMessage(
	message: string,
	values: InterpolationValues = {},
): string {
	if (!message) return "";

	let result = "";
	let idx = 0;

	while (idx < message.length) {
		// Look for ICU plural/select pattern using sticky regex (no slicing)
		icuStartPattern.lastIndex = idx;
		const icuMatch = icuStartPattern.exec(message);

		// With sticky flag (y), match must be at lastIndex, so no need to check index
		if (icuMatch) {
			const fullMatch = icuMatch[0];
			const varName = icuMatch[1];
			const type = icuMatch[2];
			const optionsStart = idx + fullMatch.length;

			// Extract options with nested brace handling
			let depth = 1;
			let optionsEnd = optionsStart;

			while (optionsEnd < message.length && depth > 0) {
				const char = message[optionsEnd];
				if (char === "{") {
					depth++;
				} else if (char === "}") {
					depth--;
				}
				optionsEnd++;
			}

			if (depth === 0) {
				// Successfully found matching closing brace
				const options = message.slice(optionsStart, optionsEnd - 1);
				const value = values[varName];
				let replacement = "";

				if (type === "plural") {
					const numValue =
						typeof value === "number"
							? value
							: Number.parseInt(String(value), 10) || 0;

					const pluralForms = parsePluralOptions(options);

					// Select appropriate form
					let form = pluralForms.other || "";

					if (numValue === 0 && "=0" in pluralForms) {
						form = pluralForms["=0"];
					} else if (numValue === 1 && "one" in pluralForms) {
						form = pluralForms.one;
					} else if ("other" in pluralForms) {
						form = pluralForms.other;
					}

					// Replace # with the number
					replacement = form.replace(/#/g, String(numValue));
				}

				if (type === "select") {
					const strValue = String(value);
					const selectForms = parseSelectOptions(options);

					// Select appropriate form or fallback to other
					replacement =
						selectForms[strValue] ||
						selectForms.other ||
						selectForms.true ||
						"";
				}

				result += replacement;
				idx = optionsEnd;
				continue;
			}
			// Malformed ICU - unmatched brace, fall through to add chars one by one
		}

		// Check for simple interpolation using sticky regex (no slicing)
		simpleInterpPattern.lastIndex = idx;
		const simpleMatch = simpleInterpPattern.exec(message);

		// With sticky flag (y), match must be at lastIndex, so no need to check index
		if (simpleMatch) {
			const key = simpleMatch[1];
			result += key in values ? String(values[key]) : simpleMatch[0];
			idx += simpleMatch[0].length;
		} else {
			result += message[idx];
			idx++;
		}
	}

	return result;
}

/**
 * Get a translated string by key
 *
 * @param key - Translation key
 * @param values - Interpolation values
 * @returns Translated and formatted string
 *
 * @example
 * t('status.orphaned_packages', { count: 3 })
 * // "3 orphaned pi packages. Run /package-guard"
 */
export function t<K extends TranslationKey>(
	key: K,
	values?: InterpolationValues,
): TranslationDict[K] extends string ? string : string[] {
	const localeTranslations =
		translations.get(currentLocale) || translations.get("en-US") || {};
	const value = localeTranslations[key] ?? translations.get("en-US")?.[key];

	if (value === undefined) {
		console.warn(`[i18n] Missing translation key: ${key}`);
		return key as unknown as TranslationDict[K] extends string
			? string
			: string[];
	}

	if (Array.isArray(value)) {
		// Handle array values (like help.features)
		if (values) {
			return value.map((item) =>
				formatMessage(item, values),
			) as unknown as TranslationDict[K] extends string ? string : string[];
		}
		return value as unknown as TranslationDict[K] extends string
			? string
			: string[];
	}

	return formatMessage(
		value,
		values,
	) as unknown as TranslationDict[K] extends string ? string : string[];
}

/**
 * Set the current locale
 *
 * @param locale - Locale code (e.g., "en-US", "es-ES")
 */
export function setLocale(locale: string): void {
	if (!translations.has(locale)) {
		console.warn(`[i18n] Locale not found: ${locale}, falling back to en-US`);
	}
	currentLocale = locale;
}

/**
 * Get the current locale
 */
export function getLocale(): string {
	return currentLocale;
}

/**
 * Register translations for a locale
 *
 * @param locale - Locale code
 * @param dict - Translation dictionary
 */
export function registerLocale(
	locale: string,
	dict: Partial<TranslationDict>,
): void {
	translations.set(locale, dict);
}

/**
 * Check if a locale is supported
 *
 * @param locale - Locale code
 */
export function isLocaleSupported(locale: string): boolean {
	return translations.has(locale);
}

/**
 * Get list of supported locales
 */
export function getSupportedLocales(): string[] {
	return Array.from(translations.keys());
}

/**
 * Detect locale from pi settings
 *
 * Reads the locale from ~/.pi/agent/settings.json if available.
 * Falls back to "en-US" if not found or not supported.
 *
 * @returns Detected locale code
 */
export function detectLocale(): string {
	try {
		const settingsPath = `${homedir()}/.pi/agent/settings.json`;
		const content = readFileSync(settingsPath, "utf-8");
		const settings = JSON.parse(content) as { locale?: string };

		if (settings.locale && isLocaleSupported(settings.locale)) {
			return settings.locale;
		}
	} catch {
		// Fall back to default
	}
	return "en-US";
}

/**
 * Initialize i18n with detected locale
 *
 * Should be called once at extension startup.
 */
export function initializeI18n(): void {
	const locale = detectLocale();
	setLocale(locale);
}
