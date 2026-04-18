// Test cases for gist utility functions

import assert from "node:assert";
import { describe, it } from "node:test";

/**
 * Extract gist ID from a GitHub Gist URL or return the input if it's already an ID.
 * Supports formats like:
 * - https://gist.github.com/username/abc123def456
 * - https://gist.github.com/abc123def456
 * - abc123def456 (passes through)
 */
function extractGistId(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/gist\.github\.com\/(?:.*\/)?([a-f0-9]+)/);
	return match ? match[1] : trimmed;
}

describe("extractGistId - GOOD CASES", () => {
	it("should extract ID from full gist URL with username", () => {
		const result = extractGistId(
			"https://gist.github.com/username/abc123def456",
		);
		assert.strictEqual(result, "abc123def456");
	});

	it("should extract ID from gist URL without username", () => {
		const result = extractGistId("https://gist.github.com/abc123def456");
		assert.strictEqual(result, "abc123def456");
	});

	it("should pass through raw gist ID", () => {
		const result = extractGistId("abc123def456");
		assert.strictEqual(result, "abc123def456");
	});

	it("should handle gist ID with only hex characters", () => {
		const result = extractGistId("abcdef1234567890abcdef1234567890");
		assert.strictEqual(result, "abcdef1234567890abcdef1234567890");
	});

	it("should handle gist ID with only numbers", () => {
		const result = extractGistId("1234567890");
		assert.strictEqual(result, "1234567890");
	});

	it("should trim whitespace from input", () => {
		const result = extractGistId("  https://gist.github.com/user/abc123  ");
		assert.strictEqual(result, "abc123");
	});

	it("should handle URL with http instead of https", () => {
		const result = extractGistId("http://gist.github.com/username/abc123");
		assert.strictEqual(result, "abc123");
	});

	it("should handle URL with trailing slash", () => {
		const result = extractGistId("https://gist.github.com/username/abc123/");
		assert.strictEqual(result, "abc123");
	});
});

describe("extractGistId - EDGE CASES", () => {
	it("should return empty string for empty input", () => {
		const result = extractGistId("");
		assert.strictEqual(result, "");
	});

	it("should return whitespace-only input unchanged (after trim becomes empty)", () => {
		const result = extractGistId("   ");
		assert.strictEqual(result, "");
	});

	it("should return non-hex ID unchanged", () => {
		const result = extractGistId("abc123xyz"); // contains x, y, z
		assert.strictEqual(result, "abc123xyz");
	});

	it("should return input unchanged for partial URL without gist ID", () => {
		const result = extractGistId("https://gist.github.com/username/");
		assert.strictEqual(result, "https://gist.github.com/username/");
	});

	it("should return input unchanged for invalid URL format", () => {
		const result = extractGistId("github.com/gist/abc123");
		assert.strictEqual(result, "github.com/gist/abc123");
	});

	it("should return input unchanged for completely different URL", () => {
		const result = extractGistId("https://github.com/user/repo");
		assert.strictEqual(result, "https://github.com/user/repo");
	});

	it("should extract first valid ID from URL with multiple path segments", () => {
		const result = extractGistId("https://gist.github.com/user/gist/abc123");
		assert.strictEqual(result, "abc123");
	});

	it("should handle URL with query parameters", () => {
		const result = extractGistId("https://gist.github.com/user/abc123?foo=bar");
		assert.strictEqual(result, "abc123");
	});

	it("should handle URL with hash fragment", () => {
		const result = extractGistId(
			"https://gist.github.com/user/abc123#file-test",
		);
		assert.strictEqual(result, "abc123");
	});
});
