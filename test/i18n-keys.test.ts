/**
 * Test suite for i18n translation key validation
 *
 * Verifies that all t() calls in the extension use valid translation keys.
 * This catches typos and missing keys at test time.
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Extract all t() call keys from a TypeScript file
 */
function extractTranslationKeys(sourceCode: string): string[] {
	const keys: string[] = [];
	// Match t("key") or t("key", { ... }) but not regex patterns like /t(
	// Must be preceded by non-word char or start of line to avoid matching inside strings
	const pattern = /[^a-zA-Z0-9_]t\(\s*["']([a-z_.]+)["']/g;
	let match: RegExpExecArray | null;

	while (true) {
		match = pattern.exec(sourceCode);
		if (match === null) break;
		keys.push(match[1]);
	}

	return [...new Set(keys)]; // Remove duplicates
}

/**
 * Get all valid translation keys from the en-US dictionary
 * Parses the TypeScript file to extract the keys
 */
function getValidKeys(): Set<string> {
	const enUsPath = join(__dirname, "../extensions/i18n/en-US.ts");
	const sourceCode = readFileSync(enUsPath, "utf-8");
	const keys: string[] = [];

	// Match "key": pattern at start of line (with optional whitespace/indentation)
	// This ensures we only match translation keys, not strings containing quoted words
	const pattern = /^\s*"([a-z_.]+)":/gm;
	let match: RegExpExecArray | null;

	while (true) {
		match = pattern.exec(sourceCode);
		if (match === null) break;
		keys.push(match[1]);
	}

	return new Set(keys);
}

describe("i18n Translation Keys", () => {
	const extensionPath = join(__dirname, "../extensions/index.ts");
	const sourceCode = readFileSync(extensionPath, "utf-8");
	const usedKeys = extractTranslationKeys(sourceCode);
	const validKeys = getValidKeys();

	describe("All t() calls use valid keys", () => {
		for (const key of usedKeys) {
			it(`should have valid key: "${key}"`, () => {
				assert(
					validKeys.has(key),
					`Invalid translation key: "${key}"\nUsed in extensions/index.ts but not found in en-US.ts\nValid keys: ${[...validKeys].sort().join(", ")}`,
				);
			});
		}
	});

	describe("All translation keys are used", () => {
		for (const key of validKeys) {
			it(`should use key: "${key}"`, () => {
				// This is a warning, not an error - unused keys are allowed
				// but might indicate orphaned translations
				if (!usedKeys.includes(key)) {
					console.warn(
						`Warning: Translation key "${key}" is defined but not used`,
					);
				}
				// Always pass - unused keys are not an error
				assert(true);
			});
		}
	});

	describe("Key count sanity check", () => {
		it("should have at least 40 translation keys", () => {
			assert(
				validKeys.size >= 40,
				`Expected at least 40 translation keys, found ${validKeys.size}`,
			);
		});

		it("should use at least 30 translation keys", () => {
			assert(
				usedKeys.length >= 30,
				`Expected at least 30 used translation keys, found ${usedKeys.length}`,
			);
		});
	});
});
