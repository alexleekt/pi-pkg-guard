/**
 * Test suite for ICU MessageFormat parser
 *
 * Tests the custom ICU MessageFormat implementation including:
 * - Simple interpolation: {name}
 * - Plural forms: {count, plural, one {# item} other {# items}}
 * - Select: {gender, select, male {he} female {she} other {they}}
 * - Nested interpolations within select/plural results
 *
 * These tests guarantee fixes for:
 * - Issue 1: Nested braces in plural expressions (was showing "other {packages}}")
 * - Issue 2: Nested interpolations in select results (was showing literal "{gistId}")
 */

import assert from "node:assert";
import { describe, it } from "node:test";

// Import the formatMessage function - need to test the internal implementation
// We'll import from the i18n module and test via t() function
import { initializeI18n, t } from "../extensions/i18n/index.ts";

// Initialize i18n before tests
initializeI18n();

describe("ICU MessageFormat Parser", () => {
	describe("Simple Interpolation", () => {
		it("should replace {name} with value", () => {
			const result = t("backup.local_success", { path: "/test/path.json" });
			assert(result.includes("/test/path.json"));
		});

		it("should leave unmatched placeholders as-is", () => {
			const result = t("backup.local_success", {});
			// {path} should remain in the string when no value provided
			assert(result.includes("{path}"));
		});
	});

	describe("Plural Forms", () => {
		it("should use 'one' form for count=1", () => {
			const result = t("scan.success", { count: 1 });
			assert(result.includes("1 orphaned package"));
			assert(!result.includes("packages}"));
			assert(!result.includes("other"));
		});

		it("should use 'other' form for count>1", () => {
			const result = t("scan.success", { count: 5 });
			assert(result.includes("5 orphaned packages"));
			assert(!result.includes("other}"));
			assert(!result.includes("{packages}"));
		});

		it("should handle count=0 with 'other' form", () => {
			const result = t("scan.found_orphans", { count: 0 });
			assert(result.includes("0 orphaned packages"));
			assert(!result.includes("other}"));
		});

		it("should handle large counts", () => {
			const result = t("scan.success", { count: 999 });
			assert(result.includes("999 orphaned packages"));
		});

		it("should not show literal ICU syntax in output (regression test)", () => {
			const result = t("scan.success", { count: 19 });
			// This was the original bug - showed "other {packages}}"
			assert(!result.includes("other {packages}"));
			assert(!result.includes("{packages}"));
			assert(!result.includes("one {package}"));
		});
	});

	describe("Select Expressions", () => {
		it("should select 'undefined' form when gistId is 'undefined'", () => {
			const result = t("config.gist_label", { gistId: "undefined", ghInstalled: true });
			assert(result.includes("Not configured"));
			assert(!result.includes("gist.github.com"));
		});

		it("should select 'other' form when gistId is set", () => {
			const result = t("config.gist_label", { gistId: "abc123", ghInstalled: true });
			assert(result.includes("https://gist.github.com/abc123"));
			assert(!result.includes("Not configured"));
		});

		it("should interpolate nested {gistId} within select result (regression test)", () => {
			const result = t("config.gist_label", { gistId: "xyz789", ghInstalled: true });
			// This was the bug - showed literal "{gistId}" instead of actual value
			assert(!result.includes("{gistId}"));
			assert(result.includes("xyz789"));
		});

		it("should handle ghInstalled=false with set gistId", () => {
			const result = t("config.gist_label", { gistId: "abc123", ghInstalled: false });
			assert(result.includes("https://gist.github.com/abc123"));
			assert(result.includes("(install gh CLI)"));
		});

		it("should handle ghInstalled=false with undefined gistId", () => {
			const result = t("config.gist_label", { gistId: "undefined", ghInstalled: false });
			assert(result.includes("Not configured"));
			assert(result.includes("(install gh CLI)"));
		});
	});

	describe("Combined Select + Nested Interpolation", () => {
		it("should handle nested {isDefault} in select result", () => {
			const result = t("config.path_label", { path: "/test/path", isDefault: true });
			assert(result.includes("(default)"));
		});

		it("should handle nested {isDefault} when false", () => {
			const result = t("config.path_label", { path: "/test/path", isDefault: false });
			assert(!result.includes("(default)"));
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty string", () => {
			// t() returns empty string for missing keys, but we can't test formatMessage directly
			// Just verify it doesn't throw
			const result = t("scan.success", { count: 0 });
			assert(typeof result === "string");
		});

		it("should handle string count values", () => {
			const result = t("scan.success", { count: "5" as unknown as number });
			// Should parse string "5" as number 5
			assert(result.includes("5 orphaned packages"));
		});

		it("should handle multiple ICU expressions in one message", () => {
			const result = t("scan.found_orphans", { count: 3 });
			// Contains both plural for "3 orphaned packages" and the list
			assert(result.includes("3 orphaned packages"));
		});
	});

	describe("Regression Tests", () => {
		it("BUG: should not show 'other {packages}}' in plural output", () => {
			// This was the exact bug: "✓ Registered 19 orphaned  other {packages}} with pi:"
			const result = t("scan.success", { count: 19 });
			assert(!result.includes("other {packages}"));
			assert(!result.includes("{packages}"));
			assert(!result.includes("one {package}"));
			assert(!result.includes("# orphaned")); // # should be replaced with number
			assert(result.includes("19 orphaned packages"));
		});

		it("BUG: should not show literal '{gistId}' in menu", () => {
			// This was the exact bug: "[Gist] https://gist.github.com/{gistId}"
			const result = t("config.gist_label", { gistId: "mygist123", ghInstalled: true });
			assert(!result.includes("{gistId}"));
			assert(result.includes("mygist123"));
		});

		it("BUG: should handle select with nested variable interpolation", () => {
			// Combined test: select chooses a form, then variables in that form are interpolated
			const result = t("config.path_label", {
				path: "/home/user/custom.json",
				isDefault: false
			});
			assert(result.includes("/home/user/custom.json"));
			assert(!result.includes("{isDefault}"));
		});
	});
});
