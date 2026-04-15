import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// =============================================================================
// Constants
// =============================================================================

const SETTINGS_PATH = `${homedir()}/.pi/agent/settings.json`;
const NPM_PREFIX = "npm:";
const STATUS_KEY = "ext:pi-pkg-guard:v1";
const CORE_PACKAGE = "@mariozechner/pi-coding-agent";
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STATUS_CLEAR_DELAY_MS = 3000;
// NPM package detection patterns
// - Starts with 'pi-' (e.g., pi-foo, pi-extmgr)
// - Ends with '-pi' (e.g., lsp-pi)
// - Contains '/pi-' in scope (e.g., @scope/pi-foo)
const PI_NAME_PATTERN = /(^pi-|-pi$|\/pi-)/;
// Keywords that indicate a package is a pi extension
const PI_KEYWORDS = ["pi-coding-agent", "pi-extension", "pi-package"];

// =============================================================================
// Types
// =============================================================================

interface PackageDiff {
	orphaned: string[]; // In npm global, not in settings
	hasOrphans: boolean;
}

interface PiSettings {
	packages?: string[];
	extensions?: string[];
}

// =============================================================================
// Type Guards
// =============================================================================

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

function isBashToolInput(input: unknown): input is { command?: string } {
	if (typeof input !== "object" || input === null) return false;
	if (Array.isArray(input)) return false;
	return true;
}

// =============================================================================
// NPM Operations
// =============================================================================

/**
 * Get list of pi-* packages installed globally via npm.
 * Returns empty array on error (non-critical operation).
 */
/**
 * Check if a package has pi-extension keywords in its package.json.
 * Reads local package.json - no network access required.
 * Returns true if keywords include any PI_KEYWORDS.
 */
function hasPiExtensionKeyword(
	nodeModulesPath: string,
	packageName: string,
): boolean {
	try {
		const pkgJsonPath = `${nodeModulesPath}/${packageName}/package.json`;
		const content = readFileSync(pkgJsonPath, "utf-8");
		const pkg = JSON.parse(content) as { keywords?: string[] };
		const keywords = pkg.keywords || [];
		return keywords.some((kw) => PI_KEYWORDS.includes(kw));
	} catch {
		// If we can't read package.json, fall back to name-only detection
		return true;
	}
}

function getNpmGlobalPackages(): string[] {
	try {
		const output = execSync("npm list -g --json --depth=0", {
			encoding: "utf-8",
			timeout: 5000,
			stdio: ["pipe", "pipe", "ignore"], // Ignore stderr
		});

		const parsed = JSON.parse(output) as {
			dependencies?: Record<string, unknown>;
		};
		const deps = parsed.dependencies || {};

		// Get global prefix for reading package.json files
		const globalPrefix = execSync("npm prefix -g", {
			encoding: "utf-8",
			timeout: 5000,
		}).trim();
		const nodeModulesPath = `${globalPrefix}/lib/node_modules`;

		return Object.keys(deps).filter(
			(name) =>
				// Match name patterns: pi-*, *-pi, @scope/pi-*
				PI_NAME_PATTERN.test(name) &&
				// Exclude core package
				name !== CORE_PACKAGE &&
				// Validate via package.json keywords (local read, no network)
				hasPiExtensionKeyword(nodeModulesPath, name),
		);
	} catch {
		// Silently fail - this is a non-critical operation
		return [];
	}
}

// =============================================================================
// Settings Operations
// =============================================================================

/**
 * Read and parse pi settings.json.
 * Returns empty settings on error (non-critical operation).
 */
function readPiSettings(): PiSettings {
	try {
		const content = readFileSync(SETTINGS_PATH, "utf-8");
		const parsed = JSON.parse(content) as unknown;

		if (!isPiSettings(parsed)) {
			return {};
		}

		return parsed;
	} catch {
		// File doesn't exist or is invalid - return empty settings
		return {};
	}
}

/**
 * Get list of packages registered in pi's settings.json.
 * Normalizes both "npm:pi-foo" and "pi-foo" formats to "pi-foo".
 */
function getRegisteredPackages(): string[] {
	const settings = readPiSettings();
	const packages = settings.packages || [];

	return packages.map((pkg: string) => {
		// Handle both "npm:pi-foo" and "pi-foo" formats
		return pkg.startsWith(NPM_PREFIX) ? pkg.slice(NPM_PREFIX.length) : pkg;
	});
}

/**
 * Write updated settings back to settings.json.
 * Silently fails on error (non-critical operation).
 */
function writePiSettings(settings: PiSettings): void {
	try {
		writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
	} catch (error) {
		// Log but don't throw - this is a non-critical operation
		console.error("[pi-pkg-guard] Failed to write settings:", error);
	}
}

// =============================================================================
// Package Analysis
// =============================================================================

/**
 * Compare npm global packages against registered packages.
 * Returns diff showing orphaned packages (installed but not registered).
 */
function analyzePackages(): PackageDiff {
	const npmPackages = new Set(getNpmGlobalPackages());
	const registeredPackages = new Set(getRegisteredPackages());

	const orphaned = [...npmPackages].filter(
		(pkg) => !registeredPackages.has(pkg),
	);

	return {
		orphaned,
		hasOrphans: orphaned.length > 0,
	};
}

/**
 * Sync orphaned packages to settings.json.
 * Adds npm: prefix to each orphaned package.
 */
function syncOrphanedPackages(diff: PackageDiff): void {
	if (diff.orphaned.length === 0) return;

	const settings = readPiSettings();
	settings.packages = settings.packages || [];

	for (const pkg of diff.orphaned) {
		const npmRef = `${NPM_PREFIX}${pkg}`;
		if (!settings.packages.includes(npmRef)) {
			settings.packages.push(npmRef);
		}
	}

	writePiSettings(settings);
}

// =============================================================================
// npm Install Guard
// =============================================================================

// Detect npm install with -g or --global and a pi-* package
const NPM_GLOBAL_PATTERN = /npm\s+(?:install|i)(?:\s+\S+)*\s+(?:-g|--global)\b/;
// Matches: pi-foo (start), lsp-pi (end), @scope/pi-foo (scoped), @scope/lsp-pi (scoped with suffix)
const PI_PACKAGE_PATTERN =
	/(?:^|\s|\/)pi-[a-z0-9-]+|(?:^|\s|\/)[a-z0-9-]+-pi(?:\s|$|@)/;

/**
 * Check if a bash command is a global npm install of a pi package.
 */
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

// =============================================================================
// Extension Entry Point
// =============================================================================

export default function (pi: ExtensionAPI) {
	let lastCheckTime = 0;

	// ===========================================================================
	// Startup Guard: Check for orphaned packages (debounced to once/hour)
	// ===========================================================================

	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "startup") return;

		const now = Date.now();
		if (now - lastCheckTime < CHECK_INTERVAL_MS) return;
		lastCheckTime = now;

		const diff = analyzePackages();

		if (diff.hasOrphans) {
			ctx.ui.setStatus(
				STATUS_KEY,
				`⚠️ ${diff.orphaned.length} orphaned pi package(s). Run /pi-pkg-guard`,
			);
		}
	});

	// ===========================================================================
	// Sync Command: Register orphaned packages
	// ===========================================================================

	pi.registerCommand("pi-pkg-guard", {
		description: "Register orphaned pi packages in settings.json",
		handler: async (_args, ctx) => {
			const diff = analyzePackages();

			if (!diff.hasOrphans) {
				ctx.ui.setStatus(STATUS_KEY, "✅ All pi packages registered");
				setTimeout(
					() => ctx.ui.setStatus(STATUS_KEY, ""),
					STATUS_CLEAR_DELAY_MS,
				);
				return;
			}

			syncOrphanedPackages(diff);
			ctx.ui.setStatus(
				STATUS_KEY,
				`✅ Registered ${diff.orphaned.length} package(s). Run /reload.`,
			);
		},
	});

	// ===========================================================================
	// npm Guard: Warn on direct npm install of pi packages
	// ===========================================================================

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return;

		const input = event.input;
		if (!isBashToolInput(input)) return;

		const command = input.command || "";
		const { isMatch, packageName } = isGlobalPiInstall(command);

		if (isMatch && packageName) {
			ctx.ui.notify(
				`⚠️ Use 'pi install npm:${packageName}' instead of 'npm install -g'`,
				"warning",
			);
		}
	});
}
