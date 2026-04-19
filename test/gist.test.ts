/**
 * Gist Utility Tests - Essential Coverage
 *
 * Tests gist ID extraction and validation.
 */

import assert from "node:assert";
import { describe, it } from "node:test";

// Minimal implementation for testing
function extractGistId(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/gist\.github\.com\/(?:.*\/)?([a-f0-9]+)/);
	return match ? match[1] : trimmed;
}

function isValidGistId(gistId: string): boolean {
	return /^[a-f0-9]+$/i.test(gistId);
}

function isValidBackupPath(backupPath: string): boolean {
	const normalized = backupPath.replace(/^~/, "/home/user");
	return (
		normalized.startsWith("/home/user/.pi/agent/") ||
		normalized.startsWith("/tmp/")
	);
}

describe("extractGistId", () => {
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

describe("isValidGistId", () => {
	it("accepts valid hex IDs", () => {
		assert.strictEqual(isValidGistId("abc123def456"), true);
		assert.strictEqual(isValidGistId("ABC123DEF456"), true);
	});

	it("rejects command injection attempts", () => {
		assert.strictEqual(isValidGistId("abc123; rm -rf ~"), false);
		assert.strictEqual(isValidGistId("abc123 && cat /etc/passwd"), false);
	});

	it("rejects empty string", () => {
		assert.strictEqual(isValidGistId(""), false);
	});
});

describe("isValidBackupPath", () => {
	it("accepts paths within .pi/agent", () => {
		assert.strictEqual(
			isValidBackupPath("/home/user/.pi/agent/backup.json"),
			true,
		);
	});

	it("accepts paths in tmpdir", () => {
		assert.strictEqual(isValidBackupPath("/tmp/backup.json"), true);
	});

	it("rejects paths outside allowed directories", () => {
		assert.strictEqual(isValidBackupPath("/etc/passwd"), false);
	});
});
