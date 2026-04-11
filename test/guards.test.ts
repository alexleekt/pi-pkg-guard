// Test cases for type guards

import assert from "node:assert";
import { describe, it } from "node:test";

// Type guard functions (copied from extensions/index.ts for testing)
function isPiSettings(
	value: unknown,
): value is { packages?: string[]; extensions?: string[] } {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return false;
	const candidate = value as Record<string, unknown>;

	if (candidate.packages !== undefined) {
		if (!Array.isArray(candidate.packages)) return false;
		if (!candidate.packages.every((p) => typeof p === "string")) return false;
	}

	if (candidate.extensions !== undefined) {
		if (!Array.isArray(candidate.extensions)) return false;
		if (!candidate.extensions.every((e) => typeof e === "string")) return false;
	}

	return true;
}

function isBashToolInput(input: unknown): input is { command?: string } {
	if (typeof input !== "object" || input === null) return false;
	if (Array.isArray(input)) return false;
	return true;
}

describe("isPiSettings", () => {
	// GOOD CASES
	it("should return true for valid PiSettings with packages", () => {
		assert.strictEqual(isPiSettings({ packages: ["npm:pi-test"] }), true);
	});

	it("should return true for valid PiSettings with extensions", () => {
		assert.strictEqual(isPiSettings({ extensions: ["/path/to/ext"] }), true);
	});

	it("should return true for valid PiSettings with both", () => {
		assert.strictEqual(
			isPiSettings({
				packages: ["npm:pi-test"],
				extensions: ["/path/to/ext"],
			}),
			true,
		);
	});

	it("should return true for empty object", () => {
		assert.strictEqual(isPiSettings({}), true);
	});

	it("should return true for empty arrays", () => {
		assert.strictEqual(isPiSettings({ packages: [], extensions: [] }), true);
	});

	// BAD CASES
	it("should return false for null", () => {
		assert.strictEqual(isPiSettings(null), false);
	});

	it("should return false for undefined", () => {
		assert.strictEqual(isPiSettings(undefined), false);
	});

	it("should return false for string", () => {
		assert.strictEqual(isPiSettings("not an object"), false);
	});

	it("should return false for number", () => {
		assert.strictEqual(isPiSettings(123), false);
	});

	it("should return false for array", () => {
		assert.strictEqual(isPiSettings(["not", "valid"]), false);
	});

	// EDGE CASES - packages
	it("should return false for packages as string", () => {
		assert.strictEqual(isPiSettings({ packages: "npm:pi-test" }), false);
	});

	it("should return false for packages with non-string elements", () => {
		assert.strictEqual(
			isPiSettings({ packages: ["valid", 123, "valid"] }),
			false,
		);
	});

	it("should return false for packages as number", () => {
		assert.strictEqual(isPiSettings({ packages: 42 }), false);
	});

	it("should return false for packages as object", () => {
		assert.strictEqual(isPiSettings({ packages: {} }), false);
	});

	it("should return false for packages as null", () => {
		assert.strictEqual(isPiSettings({ packages: null }), false);
	});

	// EDGE CASES - extensions
	it("should return false for extensions as string", () => {
		assert.strictEqual(isPiSettings({ extensions: "/path/to/ext" }), false);
	});

	it("should return false for extensions with non-string elements", () => {
		assert.strictEqual(
			isPiSettings({ extensions: ["valid", null, "valid"] }),
			false,
		);
	});

	// EDGE CASES - mixed
	it("should return false for valid packages but invalid extensions", () => {
		assert.strictEqual(
			isPiSettings({ packages: ["npm:pi-test"], extensions: "bad" }),
			false,
		);
	});

	it("should return false for invalid packages but valid extensions", () => {
		assert.strictEqual(
			isPiSettings({ packages: 123, extensions: ["/path"] }),
			false,
		);
	});

	it("should return true for object with extra properties", () => {
		assert.strictEqual(
			isPiSettings({
				packages: ["npm:pi-test"],
				extensions: ["/path"],
				extra: "ignored",
			}),
			true,
		);
	});
});

describe("isBashToolInput", () => {
	// GOOD CASES
	it("should return true for object with command string", () => {
		assert.strictEqual(isBashToolInput({ command: "npm install" }), true);
	});

	it("should return true for empty object", () => {
		assert.strictEqual(isBashToolInput({}), true);
	});

	it("should return true for object with command undefined", () => {
		assert.strictEqual(isBashToolInput({ command: undefined }), true);
	});

	it("should return true for object with extra properties", () => {
		assert.strictEqual(
			isBashToolInput({ command: "npm install", extra: 123 }),
			true,
		);
	});

	// BAD CASES
	it("should return false for null", () => {
		assert.strictEqual(isBashToolInput(null), false);
	});

	it("should return false for undefined", () => {
		assert.strictEqual(isBashToolInput(undefined), false);
	});

	it("should return false for string", () => {
		assert.strictEqual(isBashToolInput("command"), false);
	});

	it("should return false for number", () => {
		assert.strictEqual(isBashToolInput(123), false);
	});

	it("should return false for array", () => {
		assert.strictEqual(isBashToolInput(["command"]), false);
	});
});
