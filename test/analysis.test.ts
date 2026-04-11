// Test cases for package analysis logic

import assert from "node:assert";
import { describe, it } from "node:test";

// Mock types and functions
interface PackageDiff {
	orphaned: string[];
	hasOrphans: boolean;
}

// Simulated functions from extensions/index.ts
function analyzePackages(
	npmPackages: string[],
	registeredPackages: string[],
): PackageDiff {
	const npmSet = new Set(npmPackages);
	const registeredSet = new Set(registeredPackages);

	const orphaned = [...npmSet].filter((pkg) => !registeredSet.has(pkg));

	return {
		orphaned,
		hasOrphans: orphaned.length > 0,
	};
}

function syncOrphanedPackages(
	orphaned: string[],
	existingPackages: string[],
): string[] {
	const NPM_PREFIX = "npm:";
	const result = [...existingPackages];

	for (const pkg of orphaned) {
		const npmRef = `${NPM_PREFIX}${pkg}`;
		if (!result.includes(npmRef) && !result.includes(pkg)) {
			result.push(npmRef);
		}
	}

	return result;
}

// Helper to normalize package names
function normalizePackageName(pkg: string): string {
	const NPM_PREFIX = "npm:";
	return pkg.startsWith(NPM_PREFIX) ? pkg.slice(NPM_PREFIX.length) : pkg;
}

describe("analyzePackages - GOOD CASES", () => {
	it("should return no orphans when all packages are registered", () => {
		const npm = ["pi-foo", "pi-bar"];
		const registered = ["pi-foo", "pi-bar"];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, false);
		assert.deepStrictEqual(result.orphaned, []);
	});

	it("should detect orphaned packages not in registered", () => {
		const npm = ["pi-foo", "pi-bar", "pi-baz"];
		const registered = ["pi-foo"];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, ["pi-bar", "pi-baz"]);
	});

	it("should handle empty npm packages", () => {
		const npm: string[] = [];
		const registered = ["pi-foo"];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, false);
		assert.deepStrictEqual(result.orphaned, []);
	});

	it("should handle empty registered packages", () => {
		const npm = ["pi-foo", "pi-bar"];
		const registered: string[] = [];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, ["pi-foo", "pi-bar"]);
	});

	it("should handle npm: prefix in registered", () => {
		const npm = ["pi-foo", "pi-bar"];
		const registered = ["npm:pi-foo", "npm:pi-bar"].map(normalizePackageName);
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, false);
		assert.deepStrictEqual(result.orphaned, []);
	});

	it("should handle mixed prefixes in registered", () => {
		const npm = ["pi-foo", "pi-bar", "pi-baz"];
		const registered = ["npm:pi-foo", "pi-bar"].map(normalizePackageName);
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, ["pi-baz"]);
	});

	it("should exclude core package from orphaned", () => {
		// Core package is filtered BEFORE analyzePackages is called
		// So it shouldn't be in the npm list passed to analyzePackages
		const npm = ["pi-foo", "@mariozechner/pi-coding-agent"];
		// Core package should be filtered out by getNpmGlobalPackages
		const filteredNpm = npm.filter(
			(p) => p !== "@mariozechner/pi-coding-agent",
		);
		const registered: string[] = [];
		const result = analyzePackages(filteredNpm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, ["pi-foo"]);
		// Core package should not appear
		assert.strictEqual(
			result.orphaned.includes("@mariozechner/pi-coding-agent"),
			false,
		);
	});
});

describe("analyzePackages - EDGE CASES", () => {
	it("should handle duplicates in npm list", () => {
		// Set automatically deduplicates
		const npm = ["pi-foo", "pi-foo", "pi-bar"];
		const registered: string[] = [];
		const result = analyzePackages(npm, registered);

		// Should have pi-foo only once
		assert.strictEqual(result.orphaned.length, 2);
		assert.ok(result.orphaned.includes("pi-foo"));
		assert.ok(result.orphaned.includes("pi-bar"));
	});

	it("should handle scoped packages in npm", () => {
		const npm = ["pi-foo", "@scope/pi-bar"];
		const registered = ["pi-foo"];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, ["@scope/pi-bar"]);
	});

	it("should handle scoped packages in registered (normalized)", () => {
		const npm = ["@scope/pi-bar"];
		const registered = ["@scope/pi-bar"];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, false);
	});

	it("should handle empty strings", () => {
		const npm = [""];
		const registered: string[] = [];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, [""]);
	});

	it("should handle packages with special characters", () => {
		const npm = ["pi-foo.bar", "pi-foo_bar", "pi-foo~bar"];
		const registered: string[] = [];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.orphaned.length, 3);
	});

	it("should be case-sensitive", () => {
		const npm = ["pi-Foo", "PI-bar"];
		const registered = ["pi-foo", "pi-bar"];
		const result = analyzePackages(npm, registered);

		// These are different packages due to case sensitivity
		assert.strictEqual(result.hasOrphans, true);
		assert.ok(result.orphaned.includes("pi-Foo"));
		assert.ok(result.orphaned.includes("PI-bar"));
	});

	it("should handle very long package names", () => {
		const longName = "pi-" + "a".repeat(200);
		const npm = [longName];
		const registered: string[] = [];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, [longName]);
	});

	it("should handle unicode package names", () => {
		const npm = ["pi-日本語"];
		const registered: string[] = [];
		const result = analyzePackages(npm, registered);

		assert.strictEqual(result.hasOrphans, true);
		assert.deepStrictEqual(result.orphaned, ["pi-日本語"]);
	});
});

describe("syncOrphanedPackages - GOOD CASES", () => {
	it("should add orphaned packages with npm: prefix", () => {
		const orphaned = ["pi-foo", "pi-bar"];
		const existing: string[] = [];
		const result = syncOrphanedPackages(orphaned, existing);

		assert.deepStrictEqual(result, ["npm:pi-foo", "npm:pi-bar"]);
	});

	it("should preserve existing packages", () => {
		const orphaned = ["pi-baz"];
		const existing = ["npm:pi-foo", "npm:pi-bar"];
		const result = syncOrphanedPackages(orphaned, existing);

		assert.deepStrictEqual(result, ["npm:pi-foo", "npm:pi-bar", "npm:pi-baz"]);
	});

	it("should handle empty orphaned list", () => {
		const orphaned: string[] = [];
		const existing = ["npm:pi-foo"];
		const result = syncOrphanedPackages(orphaned, existing);

		assert.deepStrictEqual(result, ["npm:pi-foo"]);
	});

	it("should not duplicate if already registered without prefix", () => {
		const orphaned = ["pi-foo"];
		const existing = ["pi-foo"];
		const result = syncOrphanedPackages(orphaned, existing);

		// Should not add duplicate
		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result, ["pi-foo"]);
	});

	it("should not duplicate if already registered with prefix", () => {
		const orphaned = ["pi-foo"];
		const existing = ["npm:pi-foo"];
		const result = syncOrphanedPackages(orphaned, existing);

		// Should not add duplicate
		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result, ["npm:pi-foo"]);
	});
});

describe("syncOrphanedPackages - EDGE CASES", () => {
	it("should handle duplicates in orphaned list", () => {
		const orphaned = ["pi-foo", "pi-foo", "pi-bar"];
		const existing: string[] = [];
		const result = syncOrphanedPackages(orphaned, existing);

		// Function deduplicates - checks includes() before adding
		assert.strictEqual(result.length, 2);
		assert.deepStrictEqual(result, ["npm:pi-foo", "npm:pi-bar"]);
	});

	it("should handle empty strings in orphaned", () => {
		const orphaned = [""];
		const existing: string[] = [];
		const result = syncOrphanedPackages(orphaned, existing);

		// Empty string becomes "npm:"
		assert.deepStrictEqual(result, ["npm:"]);
	});

	it("should handle mixed formats in existing", () => {
		const orphaned = ["pi-baz"];
		const existing = ["npm:pi-foo", "pi-bar"]; // Mixed prefixes
		const result = syncOrphanedPackages(orphaned, existing);

		assert.deepStrictEqual(result, ["npm:pi-foo", "pi-bar", "npm:pi-baz"]);
	});

	it("should handle very long package names", () => {
		const longName = "pi-" + "a".repeat(200);
		const orphaned = [longName];
		const existing: string[] = [];
		const result = syncOrphanedPackages(orphaned, existing);

		assert.strictEqual(result.length, 1);
		assert.ok(result[0].startsWith("npm:"));
	});
});

describe("normalizePackageName", () => {
	it("should remove npm: prefix", () => {
		assert.strictEqual(normalizePackageName("npm:pi-foo"), "pi-foo");
	});

	it("should leave unprefixed name unchanged", () => {
		assert.strictEqual(normalizePackageName("pi-foo"), "pi-foo");
	});

	it("should handle scoped packages with prefix", () => {
		assert.strictEqual(
			normalizePackageName("npm:@scope/pi-foo"),
			"@scope/pi-foo",
		);
	});

	it("should handle empty string", () => {
		assert.strictEqual(normalizePackageName(""), "");
	});

	it("should handle string with just prefix", () => {
		assert.strictEqual(normalizePackageName("npm:"), "");
	});

	it("should handle multiple prefixes (only removes first)", () => {
		// This is actually a bug - should we remove all npm: prefixes?
		assert.strictEqual(normalizePackageName("npm:npm:pi-foo"), "npm:pi-foo");
	});
});
