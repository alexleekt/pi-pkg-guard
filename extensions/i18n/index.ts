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
 * Parse ICU MessageFormat options for plural/select forms.
 *
 * Shared implementation for both plural and select patterns:
 * - Plural: one {...} other {...} =0 {...}
 * - Select: male {...} female {...} other {...}
 */
function parseIcuOptions(options: string): Record<string, string> {
	const optionPattern = /(\w+)\s*\{([^}]*)\}/g;
	const forms: Record<string, string> = {};

	let match = optionPattern.exec(options);
	while (match !== null) {
		const [, key, content] = match;
		forms[key] = content;
		match = optionPattern.exec(options);
	}

	return forms;
}

/**
 * Parse and format an ICU MessageFormat string
 *
 * Supports:
 * - Simple interpolation: {name}
 * - Plural forms: {count, plural, one {# item} other {# items}}
 * - Select: {gender, select, male {he} female {she} other {they}}
 */
function formatMessage(
	message: string,
	values: InterpolationValues = {},
): string {
	if (!message) return "";

	// Handle ICU plural and select patterns
	// Pattern: {varName, plural, one {...} other {...}}
	// Pattern: {varName, select, value1 {...} value2 {...}}
	const icuPattern = /\{(\w+),\s*(plural|select),\s*([^}]+)\}/g;

	return message
		.replace(icuPattern, (match, varName, type, options) => {
			const value = values[varName];

			if (type === "plural") {
				const numValue =
					typeof value === "number"
						? value
						: Number.parseInt(String(value), 10) || 0;

				const pluralForms = parseIcuOptions(options);

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
				return form.replace(/#/g, String(numValue));
			}

			if (type === "select") {
				const strValue = String(value);
				const selectForms = parseIcuOptions(options);

				// Select appropriate form or fallback to other
				return (
					selectForms[strValue] || selectForms.other || selectForms.true || ""
				);
			}

			return match;
		})
		.replace(/\{(\w+)\}/g, (match, key) => {
			// Simple interpolation
			return key in values ? String(values[key]) : match;
		});
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
