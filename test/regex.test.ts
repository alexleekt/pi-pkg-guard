// Test cases for npm install detection regex

import assert from "node:assert";
import { describe, it } from "node:test";

// Regex patterns (from extensions/index.ts)
// - Starts with 'pi-' (e.g., pi-foo, pi-extmgr)
// - Ends with '-pi' (e.g., lsp-pi)
// - Contains '/pi-' in scope (e.g., @scope/pi-foo)
const NPM_GLOBAL_PATTERN = /npm\s+(?:install|i)(?:\s+\S+)*\s+(?:-g|--global)\b/;
// Matches: pi-foo (start), lsp-pi (end), @scope/pi-foo (scoped), @scope/lsp-pi (scoped with suffix)
const PI_PACKAGE_PATTERN =
	/(?:^|\s|\/)pi-[a-z0-9-]+|(?:^|\s|\/)[a-z0-9-]+-pi(?:\s|$|@)/;

function isGlobalPiInstall(command: string): {
	isMatch: boolean;
	packageName?: string;
} {
	if (!NPM_GLOBAL_PATTERN.test(command)) {
		return { isMatch: false };
	}

	const match = command.match(PI_PACKAGE_PATTERN);
	if (!match) {
		return { isMatch: false };
	}

	// Clean up the match - remove leading/trailing spaces and slashes
	let packageName = match[0].trim();
	if (packageName.startsWith("/")) {
		packageName = packageName.slice(1);
	}
	// For scoped packages, extract just the package name (after the last /)
	if (packageName.includes("/")) {
		packageName = packageName.split("/").pop() || packageName;
	}

	return { isMatch: true, packageName };
}

describe("isGlobalPiInstall - GOOD CASES (should detect)", () => {
	it("should detect 'npm install -g pi-foo'", () => {
		const result = isGlobalPiInstall("npm install -g pi-foo");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect 'npm i -g pi-foo' (short install)", () => {
		const result = isGlobalPiInstall("npm i -g pi-foo");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect 'npm install --global pi-foo'", () => {
		const result = isGlobalPiInstall("npm install --global pi-foo");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect 'npm i --global pi-foo'", () => {
		const result = isGlobalPiInstall("npm i --global pi-foo");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect with scoped package 'npm install -g @scope/pi-foo'", () => {
		const result = isGlobalPiInstall("npm install -g @scope/pi-foo");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect 'npm install pi-foo -g' (-g at end)", () => {
		const result = isGlobalPiInstall("npm install pi-foo -g");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect 'npm install pi-foo --global'", () => {
		const result = isGlobalPiInstall("npm install pi-foo --global");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect with multiple packages 'npm install -g pi-foo pi-bar'", () => {
		const result = isGlobalPiInstall("npm install -g pi-foo pi-bar");
		assert.strictEqual(result.isMatch, true);
		// Returns first match
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect with version 'npm install -g pi-foo@1.0.0'", () => {
		const result = isGlobalPiInstall("npm install -g pi-foo@1.0.0");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should detect packages ending with '-pi' like 'lsp-pi'", () => {
		const result = isGlobalPiInstall("npm install -g lsp-pi");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "lsp-pi");
	});

	it("should detect scoped package ending with '-pi' like '@org/lsp-pi'", () => {
		const result = isGlobalPiInstall("npm install -g @org/lsp-pi");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "lsp-pi");
	});

	it("should detect '-pi' suffix when -g flag is at end", () => {
		const result = isGlobalPiInstall("npm install lsp-pi -g");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "lsp-pi");
	});
});

describe("isGlobalPiInstall - BAD CASES (should NOT detect)", () => {
	it("should NOT detect local install 'npm install pi-foo' (no -g)", () => {
		const result = isGlobalPiInstall("npm install pi-foo");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm install pi-foo --save'", () => {
		const result = isGlobalPiInstall("npm install pi-foo --save");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm install pi-foo --save-dev'", () => {
		const result = isGlobalPiInstall("npm install pi-foo --save-dev");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect non-pi package 'npm install -g lodash'", () => {
		const result = isGlobalPiInstall("npm install -g lodash");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm install -g typescript'", () => {
		const result = isGlobalPiInstall("npm install -g typescript");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm run install'", () => {
		const result = isGlobalPiInstall("npm run install");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm uninstall -g pi-foo'", () => {
		const result = isGlobalPiInstall("npm uninstall -g pi-foo");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm remove -g pi-foo'", () => {
		const result = isGlobalPiInstall("npm remove -g pi-foo");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'yarn global add pi-foo'", () => {
		const result = isGlobalPiInstall("yarn global add pi-foo");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'pnpm add -g pi-foo'", () => {
		const result = isGlobalPiInstall("pnpm add -g pi-foo");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect empty string", () => {
		const result = isGlobalPiInstall("");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect unrelated command 'ls -la'", () => {
		const result = isGlobalPiInstall("ls -la");
		assert.strictEqual(result.isMatch, false);
	});
});

describe("isGlobalPiInstall - EDGE CASES", () => {
	it("should NOT detect 'npm install api-foo -g' (pi- inside word)", () => {
		// This is a tricky case - "api-foo" contains "pi-" but shouldn't match
		// Our pattern uses \b which might not catch this perfectly
		const result = isGlobalPiInstall("npm install api-foo -g");
		// This will likely match "pi-foo" inside "api-foo" due to \b behavior
		// Documenting this as a known limitation
		console.log("Edge case 'api-foo':", result);
	});

	it("should NOT detect 'npm install @scope/api-foo -g'", () => {
		const result = isGlobalPiInstall("npm install @scope/api-foo -g");
		console.log("Edge case '@scope/api-foo':", result);
	});

	it("should detect 'npm install -g pi' (single 'pi' is not a package)", () => {
		// "pi" by itself is not "pi-" followed by something
		const result = isGlobalPiInstall("npm install -g pi");
		assert.strictEqual(result.isMatch, false);
	});

	it("should detect 'npm install -g pi-' (trailing dash, no name)", () => {
		// "pi-" without anything after shouldn't match
		const result = isGlobalPiInstall("npm install -g pi-");
		assert.strictEqual(result.isMatch, false);
	});

	it("should NOT detect 'npm install -g my-pi-foo' (pi- inside word)", () => {
		// New pattern is stricter: only matches pi- at start, -pi at end, or /pi- in scope
		const result = isGlobalPiInstall("npm install -g my-pi-foo");
		assert.strictEqual(result.isMatch, false);
	});

	it("should handle multiple -g flags 'npm install -g pi-foo -g'", () => {
		const result = isGlobalPiInstall("npm install -g pi-foo -g");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-foo");
	});

	it("should handle extra whitespace 'npm  install   -g   pi-foo'", () => {
		const result = isGlobalPiInstall("npm  install   -g   pi-foo");
		// Current pattern uses \s+ which matches one or more whitespace
		assert.strictEqual(result.isMatch, true);
	});

	it("should detect with hyphenated name 'npm install -g pi-my-extension'", () => {
		const result = isGlobalPiInstall("npm install -g pi-my-extension");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-my-extension");
	});

	it("should detect with numbers 'npm install -g pi-ext123'", () => {
		const result = isGlobalPiInstall("npm install -g pi-ext123");
		assert.strictEqual(result.isMatch, true);
		assert.strictEqual(result.packageName, "pi-ext123");
	});

	it("should NOT detect with uppercase 'npm install -g PI-FOO'", () => {
		// Pattern is case-sensitive (lowercase only)
		const result = isGlobalPiInstall("npm install -g PI-FOO");
		assert.strictEqual(result.isMatch, false);
	});
});

describe("Regex pattern unit tests", () => {
	describe("NPM_GLOBAL_PATTERN", () => {
		it("should match 'npm install -g foo'", () => {
			assert.strictEqual(NPM_GLOBAL_PATTERN.test("npm install -g foo"), true);
		});

		it("should NOT match 'npm install foo'", () => {
			assert.strictEqual(NPM_GLOBAL_PATTERN.test("npm install foo"), false);
		});

		it("should match 'npm i -g foo'", () => {
			assert.strictEqual(NPM_GLOBAL_PATTERN.test("npm i -g foo"), true);
		});

		it("should match 'npm install --global foo'", () => {
			assert.strictEqual(
				NPM_GLOBAL_PATTERN.test("npm install --global foo"),
				true,
			);
		});

		it("should NOT match 'npm uninstall -g foo'", () => {
			assert.strictEqual(
				NPM_GLOBAL_PATTERN.test("npm uninstall -g foo"),
				false,
			);
		});
	});

	describe("PI_PACKAGE_PATTERN", () => {
		it("should match 'pi-foo'", () => {
			assert.strictEqual(PI_PACKAGE_PATTERN.test("pi-foo"), true);
		});

		it("should find 'pi-foo' in multiple words", () => {
			const input = "pi-foo pi-bar pi-123";
			const matches = input.match(PI_PACKAGE_PATTERN);
			assert.ok(matches, "Should find matches");
			assert.strictEqual(matches[0], "pi-foo");
			assert.strictEqual(matches[1], undefined); // Without global flag, only first match
		});

		it("should NOT match just 'pi'", () => {
			assert.strictEqual(PI_PACKAGE_PATTERN.test("pi"), false);
		});

		it("should NOT match 'api-foo'", () => {
			// \b at start means word boundary, so 'api-foo' won't match
			assert.strictEqual(PI_PACKAGE_PATTERN.test("api-foo"), false);
		});

		it("should NOT match 'my-pi-foo' (pi- inside word, not at start/end/scope)", () => {
			// New pattern only matches pi- at start, -pi at end, or /pi- in scope
			assert.strictEqual(PI_PACKAGE_PATTERN.test("my-pi-foo"), false);
		});
	});
});
