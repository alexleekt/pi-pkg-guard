/**
 * Extension Version Tests
 *
 * Verifies getExtensionVersion() returns valid version from package.json.
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// Inline implementation (same as extensions/index.ts)
function getExtensionVersion(): string {
	try {
		// Extension is at extensions/index.ts, package.json is one level up
		const pkgPath = new URL("../package.json", import.meta.url);
		const content = readFileSync(pkgPath, "utf-8");
		const pkg = JSON.parse(content) as { version?: string };
		return pkg.version || "unknown";
	} catch {
		return "unknown";
	}
}

// Read package.json for expected version
const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };

describe("getExtensionVersion", () => {
	it("returns version from package.json", () => {
		const version = getExtensionVersion();
		assert.strictEqual(version, pkg.version);
	});

	it("returns non-unknown version", () => {
		const version = getExtensionVersion();
		assert.notStrictEqual(
			version,
			"unknown",
			"Version should not be 'unknown' - check path resolution",
		);
	});

	it("returns valid semver format", () => {
		const version = getExtensionVersion();
		// Basic semver check: x.y.z or x.y.z-prerelease
		const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
		assert.ok(
			semverPattern.test(version),
			`Version "${version}" should be valid semver`,
		);
	});
});
