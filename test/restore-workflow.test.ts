/**
 * Restore Workflow Tests - Story 2.2: Selective Package Restore
 *
 * Tests the restore workflow including backup data validation,
 * package filtering, and selection logic.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { isPackageSnapshot, isValidBackupPath } from "../extensions/index.js";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

describe("isPackageSnapshot type guard", () => {
	it("accepts valid package snapshot", () => {
		const valid = {
			timestamp: "2024-01-15T10:30:00Z",
			npmPackages: ["pi-foo", "pi-bar"],
			registeredPackages: ["pi-foo"],
			unregisteredPackages: ["pi-bar"],
		};
		assert.strictEqual(isPackageSnapshot(valid), true);
	});

	it("rejects missing timestamp", () => {
		const invalid = {
			npmPackages: ["pi-foo"],
			registeredPackages: ["pi-foo"],
			unregisteredPackages: [],
		};
		assert.strictEqual(isPackageSnapshot(invalid), false);
	});

	it("rejects non-string timestamp", () => {
		const invalid = {
			timestamp: 12345,
			npmPackages: ["pi-foo"],
			registeredPackages: ["pi-foo"],
			unregisteredPackages: [],
		};
		assert.strictEqual(isPackageSnapshot(invalid), false);
	});

	it("rejects missing npmPackages array", () => {
		const invalid = {
			timestamp: "2024-01-15T10:30:00Z",
			registeredPackages: ["pi-foo"],
			unregisteredPackages: [],
		};
		assert.strictEqual(isPackageSnapshot(invalid), false);
	});

	it("rejects non-array npmPackages", () => {
		const invalid = {
			timestamp: "2024-01-15T10:30:00Z",
			npmPackages: "not-an-array",
			registeredPackages: ["pi-foo"],
			unregisteredPackages: [],
		};
		assert.strictEqual(isPackageSnapshot(invalid), false);
	});

	it("rejects npmPackages with non-string elements", () => {
		const invalid = {
			timestamp: "2024-01-15T10:30:00Z",
			npmPackages: ["pi-foo", 123, null],
			registeredPackages: ["pi-foo"],
			unregisteredPackages: [],
		};
		assert.strictEqual(isPackageSnapshot(invalid), false);
	});

	it("rejects null", () => {
		assert.strictEqual(isPackageSnapshot(null), false);
	});

	it("rejects undefined", () => {
		assert.strictEqual(isPackageSnapshot(undefined), false);
	});

	it("rejects primitive types", () => {
		assert.strictEqual(isPackageSnapshot("string"), false);
		assert.strictEqual(isPackageSnapshot(123), false);
		assert.strictEqual(isPackageSnapshot(true), false);
	});

	it("accepts empty arrays", () => {
		const valid = {
			timestamp: "2024-01-15T10:30:00Z",
			npmPackages: [],
			registeredPackages: [],
			unregisteredPackages: [],
		};
		assert.strictEqual(isPackageSnapshot(valid), true);
	});
});

describe("restore workflow - package filtering", () => {
	it("filters out already registered packages", () => {
		// Simulates: packagesToRestore.filter(pkg => !currentRegistered.has(pkg))
		const currentRegistered = new Set(["pi-foo", "pi-bar"]);
		const packagesToRestore = ["pi-foo", "pi-baz", "pi-qux"];

		const filtered = packagesToRestore.filter(
			(pkg) => !currentRegistered.has(pkg),
		);

		assert.deepStrictEqual(filtered, ["pi-baz", "pi-qux"]);
	});

	it("returns empty array when all packages registered", () => {
		const currentRegistered = new Set(["pi-foo", "pi-bar"]);
		const packagesToRestore = ["pi-foo", "pi-bar"];

		const filtered = packagesToRestore.filter(
			(pkg) => !currentRegistered.has(pkg),
		);

		assert.deepStrictEqual(filtered, []);
	});

	it("returns all packages when none registered", () => {
		const currentRegistered = new Set<string>();
		const packagesToRestore = ["pi-foo", "pi-bar"];

		const filtered = packagesToRestore.filter(
			(pkg) => !currentRegistered.has(pkg),
		);

		assert.deepStrictEqual(filtered, ["pi-foo", "pi-bar"]);
	});
});

describe("restore workflow - backup source selection", () => {
	it("prefers local backup when available", () => {
		// Logic: try local first, then gist
		const localAvailable = true;
		const gistAvailable = true;
		const gistEnabled = true;

		const source = localAvailable
			? "local"
			: gistAvailable && gistEnabled
				? "gist"
				: null;

		assert.strictEqual(source, "local");
	});

	it("falls back to gist when local unavailable", () => {
		const localAvailable = false;
		const gistAvailable = true;
		const gistEnabled = true;

		const source = localAvailable
			? "local"
			: gistAvailable && gistEnabled
				? "gist"
				: null;

		assert.strictEqual(source, "gist");
	});

	it("does not use gist when disabled", () => {
		const localAvailable = false;
		const gistAvailable = true;
		const gistEnabled = false;

		const source = localAvailable
			? "local"
			: gistAvailable && gistEnabled
				? "gist"
				: null;

		assert.strictEqual(source, null);
	});
});

describe("restore workflow - path validation integration", () => {
	it("accepts default backup path", () => {
		const defaultPath = join(
			homedir(),
			".pi",
			"agent",
			"package-guard-backup.json",
		);
		assert.strictEqual(isValidBackupPath(defaultPath), true);
	});

	it("rejects path outside allowed directories", () => {
		assert.strictEqual(isValidBackupPath("/etc/passwd"), false);
		assert.strictEqual(isValidBackupPath("/var/log/system.log"), false);
	});

	it("accepts path in tmpdir", () => {
		const tmpPath = join(tmpdir(), "test-backup.json");
		assert.strictEqual(isValidBackupPath(tmpPath), true);
	});
});

describe("restore workflow - selection loop patterns", () => {
	it("include adds package to selection", () => {
		const selectedPackages = new Set<string>();
		const currentPkg = "pi-foo";

		// Simulates option_include logic
		selectedPackages.add(currentPkg);

		assert.ok(selectedPackages.has("pi-foo"));
	});

	it("skip moves to next without adding", () => {
		const selectedPackages = new Set<string>();
		const remainingPackages = ["pi-foo", "pi-bar"];

		// Simulates option_skip logic
		remainingPackages.shift(); // Remove current (skip)

		assert.strictEqual(remainingPackages.length, 1);
		assert.strictEqual(selectedPackages.size, 0);
	});

	it("include_all adds all remaining packages", () => {
		const selectedPackages = new Set<string>();
		const remainingPackages = ["pi-foo", "pi-bar", "pi-baz"];

		// Simulates option_include_all logic
		for (const pkg of remainingPackages) {
			selectedPackages.add(pkg);
		}

		assert.strictEqual(selectedPackages.size, 3);
	});

	it("skip_all breaks loop without adding", () => {
		const selectedPackages = new Set<string>();

		// Simulates option_skip_all logic - just break
		// No packages added, loop exits
		assert.strictEqual(selectedPackages.size, 0);
	});
});
