/**
 * Backup Data Validation Tests
 *
 * Tests for validateBackupData function and backup schema validation.
 *
 * NOTE: The validateBackupData implementation is duplicated here rather than
 * imported from extensions/index.ts. This is intentional isolation - importing
 * from the extension would trigger the entire i18n initialization chain and
 * other side effects. The test file mirrors the implementation to avoid
 * loading the full extension while testing the validation logic.
 */

import assert from "node:assert";
import { describe, it } from "node:test";

// =============================================================================
// Constants (mirroring extensions/index.ts)
// =============================================================================

const EXTENSION_VERSION = "0.7.0";
const BACKUP_DATA_SCHEMA_URL = `https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/v${EXTENSION_VERSION}/schema/backup-data.json`;

// Accept schema URLs from any version tag, main branch, or refs/tags pattern
const ALLOWED_SCHEMA_URL_PATTERNS = [
	BACKUP_DATA_SCHEMA_URL,
	/^https:\/\/raw\.githubusercontent\.com\/alexleekt\/pi-pkg-guard\/v\d+\.\d+\.\d+\/schema\/backup-data\.json$/,
	/^https:\/\/raw\.githubusercontent\.com\/alexleekt\/pi-pkg-guard\/refs\/tags\/v\d+\.\d+\.\d+\/schema\/backup-data\.json$/,
	"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/refs/heads/main/schema/backup-data.json",
	"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/main/schema/backup-data.json",
];

// =============================================================================
// Types (mirroring extensions/index.ts)
// =============================================================================

interface ValidationResult {
	valid: boolean;
	errors: string[];
}

// =============================================================================
// Validation Implementation (mirroring extensions/index.ts)
// =============================================================================

function validateBackupData(data: unknown): ValidationResult {
	const errors: string[] = [];

	// Check if it's an object
	if (typeof data !== "object" || data === null) {
		return { valid: false, errors: ["Data must be an object"] };
	}

	if (Array.isArray(data)) {
		return { valid: false, errors: ["Data must be an object, not an array"] };
	}

	const candidate = data as Record<string, unknown>;

	// Check $schema field
	if (candidate.$schema === undefined) {
		errors.push("Missing required field: $schema");
	} else if (typeof candidate.$schema !== "string") {
		errors.push("Field '$schema' must be a string");
	} else {
		const isValidSchemaUrl = ALLOWED_SCHEMA_URL_PATTERNS.some((pattern) =>
			typeof pattern === "string"
				? candidate.$schema === pattern
				: pattern.test(candidate.$schema as string),
		);
		if (!isValidSchemaUrl) {
			errors.push(
				`Unrecognized schema URL: '${candidate.$schema}'. Expected a pi-pkg-guard backup schema URL.`,
			);
		}
	}

	// Check timestamp
	if (candidate.timestamp === undefined) {
		errors.push("Missing required field: timestamp");
	} else if (typeof candidate.timestamp !== "string") {
		errors.push("Field 'timestamp' must be a string");
	} else if (Number.isNaN(Date.parse(candidate.timestamp))) {
		errors.push("Field 'timestamp' must be a valid ISO 8601 date-time string");
	}

	// Check npmPackages
	if (candidate.npmPackages === undefined) {
		errors.push("Missing required field: npmPackages");
	} else if (!Array.isArray(candidate.npmPackages)) {
		errors.push("Field 'npmPackages' must be an array");
	} else {
		for (let i = 0; i < candidate.npmPackages.length; i++) {
			if (typeof candidate.npmPackages[i] !== "string") {
				errors.push(`Field 'npmPackages[${i}]' must be a string`);
			}
		}
	}

	// Check excludedPackages (optional)
	if (candidate.excludedPackages !== undefined) {
		if (!Array.isArray(candidate.excludedPackages)) {
			errors.push("Field 'excludedPackages' must be an array");
		} else {
			for (let i = 0; i < candidate.excludedPackages.length; i++) {
				if (typeof candidate.excludedPackages[i] !== "string") {
					errors.push(`Field 'excludedPackages[${i}]' must be a string`);
				}
			}
		}
	}

	// Check for additional properties
	const allowedKeys = [
		"$schema",
		"timestamp",
		"npmPackages",
		"excludedPackages",
	];
	for (const key of Object.keys(candidate)) {
		if (!allowedKeys.includes(key)) {
			errors.push(`Unexpected property: '${key}'`);
		}
	}

	return { valid: errors.length === 0, errors };
}

// =============================================================================
// Test Suites
// =============================================================================

describe("validateBackupData", () => {
	describe("valid backup data (should return valid=true)", () => {
		it("accepts minimal valid backup", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, true);
			assert.deepStrictEqual(result.errors, []);
		});

		it("accepts backup with packages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: ["pi-foo", "pi-bar", "@scope/pi-ext"],
			});
			assert.strictEqual(result.valid, true);
			assert.deepStrictEqual(result.errors, []);
		});

		it("accepts backup with excludedPackages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: ["pi-foo"],
				excludedPackages: ["excluded-pkg"],
			});
			assert.strictEqual(result.valid, true);
			assert.deepStrictEqual(result.errors, []);
		});

		it("accepts backup with empty arrays", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				excludedPackages: [],
			});
			assert.strictEqual(result.valid, true);
			assert.deepStrictEqual(result.errors, []);
		});

		it("accepts full-featured backup", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: new Date().toISOString(),
				npmPackages: ["pi-foo", "pi-bar"],
				excludedPackages: ["some-pkg", "another-pkg"],
			});
			assert.strictEqual(result.valid, true);
			assert.deepStrictEqual(result.errors, []);
		});
	});

	describe("invalid type structure (should return valid=false)", () => {
		it("rejects null", () => {
			const result = validateBackupData(null);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("must be an object")));
		});

		it("rejects undefined", () => {
			const result = validateBackupData(undefined);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("must be an object")));
		});

		it("rejects array", () => {
			const result = validateBackupData([]);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("not an array")));
		});

		it("rejects string", () => {
			const result = validateBackupData("not an object");
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("must be an object")));
		});

		it("rejects number", () => {
			const result = validateBackupData(42);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("must be an object")));
		});

		it("rejects boolean", () => {
			const result = validateBackupData(true);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("must be an object")));
		});
	});

	describe("missing required fields", () => {
		it("rejects missing $schema", () => {
			const result = validateBackupData({
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("$schema")));
		});

		it("rejects missing timestamp", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("timestamp")));
		});

		it("rejects missing npmPackages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("npmPackages")));
		});

		it("reports all missing fields at once", () => {
			const result = validateBackupData({});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.length >= 3);
			assert.ok(result.errors.some((e) => e.includes("$schema")));
			assert.ok(result.errors.some((e) => e.includes("timestamp")));
			assert.ok(result.errors.some((e) => e.includes("npmPackages")));
		});
	});

	describe("schema URL validation", () => {
		it("rejects wrong schema URL", () => {
			const result = validateBackupData({
				$schema: "https://example.com/wrong-schema.json",
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) => e.includes("Unrecognized schema URL")),
			);
		});

		it("rejects non-string $schema", () => {
			const result = validateBackupData({
				$schema: 123,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some(
					(e) => e.includes("$schema") && e.includes("string"),
				),
			);
		});

		it("accepts current version schema URL", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, true);
		});

		it("accepts any versioned schema URL", () => {
			const validUrls = [
				"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/v0.5.0/schema/backup-data.json",
				"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/v0.6.0/schema/backup-data.json",
				"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/v1.0.0/schema/backup-data.json",
				"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/v10.20.30/schema/backup-data.json",
			];

			for (const url of validUrls) {
				const result = validateBackupData({
					$schema: url,
					timestamp: "2024-01-15T10:30:00.000Z",
					npmPackages: [],
				});
				assert.strictEqual(
					result.valid,
					true,
					`Should accept versioned URL: ${url}`,
				);
			}
		});

		it("accepts refs/tags pattern schema URLs", () => {
			const result = validateBackupData({
				$schema:
					"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/refs/tags/v0.5.0/schema/backup-data.json",
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, true);
		});

		it("accepts main branch schema URLs", () => {
			const mainUrls = [
				"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/refs/heads/main/schema/backup-data.json",
				"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/main/schema/backup-data.json",
			];

			for (const url of mainUrls) {
				const result = validateBackupData({
					$schema: url,
					timestamp: "2024-01-15T10:30:00.000Z",
					npmPackages: [],
				});
				assert.strictEqual(
					result.valid,
					true,
					`Should accept main branch URL: ${url}`,
				);
			}
		});

		it("rejects URLs from other repos", () => {
			const result = validateBackupData({
				$schema:
					"https://raw.githubusercontent.com/someone-else/other-repo/v1.0.0/schema/backup-data.json",
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) => e.includes("Unrecognized schema URL")),
			);
		});

		it("rejects malformed URLs", () => {
			const result = validateBackupData({
				$schema: "not-a-url",
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) => e.includes("Unrecognized schema URL")),
			);
		});
	});

	describe("timestamp validation", () => {
		it("rejects non-string timestamp", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: 1234567890,
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some(
					(e) => e.includes("timestamp") && e.includes("string"),
				),
			);
		});

		it("rejects invalid date format", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "not-a-date",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("ISO 8601")));
		});

		it("rejects empty timestamp", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("ISO 8601")));
		});

		it("accepts valid ISO 8601 formats", () => {
			const validTimestamps = [
				"2024-01-15T10:30:00.000Z",
				"2024-01-15T10:30:00Z",
				"2024-01-15T10:30:00+00:00",
				"2024-01-15",
				"2024-01-15T10:30:00.123456Z",
			];

			for (const timestamp of validTimestamps) {
				const result = validateBackupData({
					$schema: BACKUP_DATA_SCHEMA_URL,
					timestamp,
					npmPackages: [],
				});
				assert.strictEqual(
					result.valid,
					true,
					`Should accept timestamp: ${timestamp}`,
				);
			}
		});
	});

	describe("npmPackages validation", () => {
		it("rejects non-array npmPackages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: "not-an-array",
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some(
					(e) => e.includes("npmPackages") && e.includes("array"),
				),
			);
		});

		it("rejects non-string elements in npmPackages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: ["pkg1", 123, "pkg2"],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some(
					(e) => e.includes("npmPackages[1]") && e.includes("string"),
				),
			);
		});

		it("reports multiple non-string elements", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [null, 123, true],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("npmPackages[0]")));
			assert.ok(result.errors.some((e) => e.includes("npmPackages[1]")));
			assert.ok(result.errors.some((e) => e.includes("npmPackages[2]")));
		});

		it("accepts empty npmPackages array", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, true);
		});
	});

	describe("excludedPackages validation (optional field)", () => {
		it("accepts when excludedPackages is undefined", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, true);
		});

		it("rejects non-array excludedPackages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				excludedPackages: "not-an-array",
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some(
					(e) => e.includes("excludedPackages") && e.includes("array"),
				),
			);
		});

		it("rejects non-string elements in excludedPackages", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				excludedPackages: ["pkg1", 123],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some(
					(e) => e.includes("excludedPackages[1]") && e.includes("string"),
				),
			);
		});

		it("accepts empty excludedPackages array", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				excludedPackages: [],
			});
			assert.strictEqual(result.valid, true);
		});

		it("accepts valid excludedPackages array", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				excludedPackages: ["excluded-pkg", "another-excluded"],
			});
			assert.strictEqual(result.valid, true);
		});
	});

	describe("additional properties rejection", () => {
		it("rejects unknown top-level property", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				unknownField: "value",
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) =>
					e.includes("Unexpected property: 'unknownField'"),
				),
			);
		});

		it("rejects version field (from old schema)", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				version: "1.0.0",
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) => e.includes("Unexpected property: 'version'")),
			);
		});

		it("rejects registeredPackages field (from old schema)", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				registeredPackages: ["pkg"],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) =>
					e.includes("Unexpected property: 'registeredPackages'"),
				),
			);
		});

		it("rejects orphanedPackages field (from old schema)", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				orphanedPackages: ["pkg"],
			});
			assert.strictEqual(result.valid, false);
			assert.ok(
				result.errors.some((e) =>
					e.includes("Unexpected property: 'orphanedPackages'"),
				),
			);
		});

		it("reports multiple unexpected properties", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				foo: "bar",
				baz: 123,
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("'foo'")));
			assert.ok(result.errors.some((e) => e.includes("'baz'")));
		});
	});

	describe("edge cases and boundary conditions", () => {
		it("accepts empty string package names", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [""],
			});
			assert.strictEqual(result.valid, true);
		});

		it("accepts special characters in package names", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: ["@scope/pkg", "pkg-with-dashes", "pkg.with.dots"],
			});
			assert.strictEqual(result.valid, true);
		});

		it("handles very long arrays", () => {
			const longArray = Array(1000).fill("pi-package");
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: longArray,
			});
			assert.strictEqual(result.valid, true);
		});

		it("handles nested objects gracefully (rejects as additional property)", () => {
			const result = validateBackupData({
				$schema: BACKUP_DATA_SCHEMA_URL,
				timestamp: "2024-01-15T10:30:00.000Z",
				npmPackages: [],
				nested: { key: "value" },
			});
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes("'nested'")));
		});
	});
});
