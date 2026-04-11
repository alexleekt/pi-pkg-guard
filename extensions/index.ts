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
	return typeof value === "object" && value !== null;
}

function isBashToolInput(input: unknown): input is { command?: string } {
	return typeof input === "object" && input !== null;
}

// =============================================================================
// NPM Operations
// =============================================================================

/**
 * Get list of pi-* packages installed globally via npm.
 * Returns empty array on error (non-critical operation).
 */
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

		return Object.keys(deps).filter(
			(name) =>
				(name.startsWith("pi-") || name.includes("/pi-")) &&
				name !== CORE_PACKAGE,
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
const NPM_GLOBAL_PATTERN = /npm\s+(install|i)\s+.*(-g|--global)/;
const PI_PACKAGE_PATTERN = /pi-[\w-]+/;

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

	return { isMatch: true, packageName: match[0] };
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
