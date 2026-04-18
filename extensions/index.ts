import { execSync, exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";

// =============================================================================
// Constants
// =============================================================================

const SETTINGS_PATH = `${homedir()}/.pi/agent/settings.json`;
const NPM_PREFIX = "npm:";
const STATUS_KEY = "ext:pi-pkg-guard:v1";
const CONFIG_KEY = "pi-pkg-guard";
const CORE_PACKAGE = "@mariozechner/pi-coding-agent";
const DEFAULT_BACKUP_PATH = `${homedir()}/.pi/agent/package-guard-backup.json`;

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

interface GuardConfig {
	backupPath?: string;
	gistId?: string;
	gistEnabled?: boolean;
}

interface BackupData {
	timestamp: string;
	npmPackages: string[];
	registeredPackages: string[];
	orphanedPackages: string[];
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

// =============================================================================
// Gist Utilities
// =============================================================================

/**
 * Extract gist ID from a GitHub Gist URL or return the input if it's already an ID.
 * Supports formats like:
 * - https://gist.github.com/username/abc123def456
 * - https://gist.github.com/abc123def456
 * - abc123def456 (passes through)
 *
 * @param input - URL or gist ID
 * @returns The extracted gist ID or the original input
 */
function extractGistId(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/gist\.github\.com\/(?:.*\/)?([a-f0-9]+)/);
	return match ? match[1] : trimmed;
}

/**
 * Remove npm: prefix from package name if present.
 */
function normalizePackageName(pkg: string): string {
	return pkg.startsWith(NPM_PREFIX) ? pkg.slice(NPM_PREFIX.length) : pkg;
}

// =============================================================================
// NPM Operations
// =============================================================================

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
			timeout: 30000,
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

function readGuardConfig(): GuardConfig {
	try {
		const settings = readPiSettings();
		const config = (settings as Record<string, unknown>)[CONFIG_KEY];

		if (!isGuardConfig(config)) {
			return {};
		}

		return config;
	} catch {
		return {};
	}
}

function writeGuardConfig(config: GuardConfig): void {
	try {
		const settings = readPiSettings();
		(settings as Record<string, unknown>)[CONFIG_KEY] = config;
		writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
	} catch (error) {
		// Log but don't throw - this is a non-critical operation
		console.error("[pi-pkg-guard] Failed to write guard config:", error);
	}
}

/**
 * Get registered packages from settings.json.
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
 * Analyze packages to find orphaned pi extensions.
 * Orphaned = installed via npm but not registered in pi settings.
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
// Backup Operations
// =============================================================================

/**
 * Create backup data object with current package state.
 */
function createBackupData(): BackupData {
	const npmPackages = getNpmGlobalPackages();
	const registeredPackages = getRegisteredPackages();
	const diff = analyzePackages();

	return {
		timestamp: new Date().toISOString(),
		npmPackages,
		registeredPackages,
		orphanedPackages: diff.orphaned,
	};
}

/**
 * Save backup to local file.
 */
function saveLocalBackup(backupPath: string): void {
	const data = createBackupData();
	writeFileSync(backupPath, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Check if gh CLI is installed.
 */
function isGhInstalled(): boolean {
	try {
		execSync("gh --version", { encoding: "utf-8", timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}

/**
 * Sync backup to GitHub Gist using gh CLI.
 */
async function syncGistBackup(
	gistId: string,
	data: BackupData,
): Promise<{ success: boolean; error?: string }> {
	if (!isGhInstalled()) {
		return {
			success: false,
			error:
				"GitHub CLI (gh) is not installed. Install it from https://cli.github.com or use the local backup only.",
		};
	}

	try {
		// Create temp file with the content
		const timestamp = Date.now();
		const tempFile = `/tmp/package-guard-backup-${timestamp}.json`;
		const content = `${JSON.stringify(data, null, 2)}\n`;
		writeFileSync(tempFile, content);

		// Update the gist file using the temp file (async - non-blocking)
		await execAsync(
			`gh gist edit ${gistId} ${tempFile} --filename "package-guard-backup.json"`,
			{
				timeout: 30000,
			},
		);

		// Clean up temp file
		try {
			unlinkSync(tempFile);
		} catch {
			// Ignore cleanup errors
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Create a new GitHub Gist using gh CLI.
 */
async function createGist(): Promise<{
	success: boolean;
	gistId?: string;
	error?: string;
}> {
	if (!isGhInstalled()) {
		return {
			success: false,
			error:
				"GitHub CLI (gh) is not installed. Install it from https://cli.github.com",
		};
	}

	try {
		// Create temp file for initial content
		const timestamp = Date.now();
		const tempFile = `/tmp/package-guard-create-${timestamp}.json`;
		writeFileSync(tempFile, '{"status": "initial backup"}\n');

		// Create gist using temp file (async - non-blocking)
		const { stdout } = await execAsync(
			`gh gist create --public --filename "package-guard-backup.json" --desc "Package Guard backup" ${tempFile}`,
			{
				timeout: 30000,
			},
		);

		// Clean up temp file
		try {
			unlinkSync(tempFile);
		} catch {
			// Ignore cleanup errors
		}

		// Extract gist ID from output URL
		const gistId = extractGistId(stdout);
		if (gistId && gistId !== stdout.trim()) {
			return { success: true, gistId };
		}

		return { success: false, error: "Could not extract gist ID from output" };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Delete a GitHub Gist using gh CLI.
 */
async function deleteGist(
	gistId: string,
): Promise<{ success: boolean; error?: string }> {
	if (!isGhInstalled()) {
		return {
			success: false,
			error:
				"GitHub CLI (gh) is not installed. Install it from https://cli.github.com",
		};
	}

	try {
		await execAsync(`gh gist delete ${gistId}`, {
			timeout: 30000,
		});

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// ===========================================================================
// Gist Content Retrieval
// ===========================================================================

/**
 * Fetch gist content using gh CLI.
 */
async function getGistContent(
	gistId: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
	if (!isGhInstalled()) {
		return {
			success: false,
			error:
				"GitHub CLI (gh) is not installed. Install it from https://cli.github.com",
		};
	}

	try {
		const { stdout } = await execAsync(`gh gist view ${gistId} --raw`, {
			timeout: 30000,
		});

		return { success: true, content: stdout };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// ===========================================================================
// Unified Command Handler Functions
// ===========================================================================

async function handleRun(ctx: ExtensionCommandContext): Promise<void> {
	const diff = analyzePackages();

	if (!diff.hasOrphans) {
		ctx.ui.notify(
			"✓ All pi packages are registered. No orphaned packages found.",
			"info",
		);
		return;
	}

	ctx.ui.notify(
		`Found ${diff.orphaned.length} orphaned package(s):\n${diff.orphaned.map((p) => `  - ${p}`).join("\n")}`,
		"warning",
	);

	syncOrphanedPackages(diff);

	ctx.ui.notify(
		`✓ Registered ${diff.orphaned.length} orphaned package(s) with pi:\n${diff.orphaned.map((p) => `  - npm:${p}`).join("\n")}\n\nRun /reload to activate the registered packages.`,
		"info",
	);
}

async function handleBackup(ctx: ExtensionCommandContext): Promise<void> {
	const config = readGuardConfig();
	const data = createBackupData();
	const backupPath = config.backupPath || DEFAULT_BACKUP_PATH;

	ctx.ui.setWorkingMessage("Saving backup...");

	try {
		saveLocalBackup(backupPath);
		ctx.ui.notify(`✓ Local backup saved:\n  ${backupPath}`, "info");
	} catch (error) {
		ctx.ui.setWorkingMessage();
		ctx.ui.notify(
			`✗ Failed to save backup:\n${error instanceof Error ? error.message : String(error)}`,
			"error",
		);
		return;
	}

	if (config.gistId && config.gistEnabled !== false) {
		ctx.ui.setWorkingMessage("Syncing to GitHub Gist...");
		const result = await syncGistBackup(config.gistId, data);
		if (result.success) {
			ctx.ui.notify(
				`✓ Synced to GitHub Gist:\n  https://gist.github.com/${config.gistId}`,
				"info",
			);
		} else {
			ctx.ui.notify(
				`✓ Local backup saved\n⚠ Gist sync failed:\n${result.error}`,
				"warning",
			);
		}
	}

	ctx.ui.setWorkingMessage();
}

async function handleRestore(ctx: ExtensionCommandContext): Promise<void> {
	const config = readGuardConfig();
	const backupPath = config.backupPath || DEFAULT_BACKUP_PATH;

	let backupData: BackupData | null = null;
	let backupSource = "local";

	ctx.ui.setWorkingMessage("Reading backup...");

	try {
		const content = readFileSync(backupPath, "utf-8");
		const parsed = JSON.parse(content) as BackupData;
		if (parsed && Array.isArray(parsed.registeredPackages)) {
			backupData = parsed;
		}
	} catch {
		// Local backup failed, will try gist
	}

	if (!backupData && config.gistId && isGhInstalled()) {
		try {
			const result = await getGistContent(config.gistId);
			if (result.success && result.content) {
				const parsed = JSON.parse(result.content) as BackupData;
				if (parsed && Array.isArray(parsed.registeredPackages)) {
					backupData = parsed;
					backupSource = "gist";
				}
			}
		} catch {
			// Gist backup failed too
		}
	}

	ctx.ui.setWorkingMessage();

	if (!backupData) {
		ctx.ui.notify(
			"✗ No backup found.\n\nRun Backup first to create a backup.",
			"error",
		);
		return;
	}

	ctx.ui.notify(
		`✓ Loaded backup from ${backupSource}:\n  ${backupData.timestamp}`,
		"info",
	);

	const currentRegistered = new Set(getRegisteredPackages());
	const packagesToRestore = backupData.registeredPackages.filter(
		(pkg) => !currentRegistered.has(pkg),
	);

	if (packagesToRestore.length === 0) {
		ctx.ui.notify(
			`✓ All ${backupData.registeredPackages.length} package(s) from backup are already registered.\n\nNo restore needed.`,
			"info",
		);
		return;
	}

	ctx.ui.notify(
		`${packagesToRestore.length} package(s) from backup not currently registered:\n${packagesToRestore.map((p) => `  - ${p}`).join("\n")}`,
		"info",
	);

	const selectedPackages = new Set<string>();
	const remainingPackages = [...packagesToRestore];

	while (remainingPackages.length > 0) {
		const currentPkg = remainingPackages[0];
		const choice = await ctx.ui.select(
			`Package ${packagesToRestore.length - remainingPackages.length + 1} of ${packagesToRestore.length}: ${currentPkg}`,
			[
				"Include this package",
				"Skip this package",
				"Include all remaining",
				"Skip all remaining",
			],
		);

		if (choice === "Include this package") {
			selectedPackages.add(currentPkg);
			remainingPackages.shift();
		} else if (choice === "Skip this package") {
			remainingPackages.shift();
		} else if (choice === "Include all remaining") {
			for (const pkg of remainingPackages) {
				selectedPackages.add(pkg);
			}
			break;
		} else if (choice === "Skip all remaining") {
			break;
		}
	}

	if (selectedPackages.size === 0) {
		ctx.ui.notify("No packages selected for restore", "info");
		return;
	}

	const confirmed = await ctx.ui.confirm(
		"Restore selected packages?",
		`This will register ${selectedPackages.size} package(s) with pi.`,
	);

	if (!confirmed) {
		ctx.ui.notify("Restore cancelled", "info");
		return;
	}

	ctx.ui.setWorkingMessage("Restoring packages...");

	const settings = readPiSettings();
	settings.packages = settings.packages || [];

	let added = 0;
	for (const pkg of selectedPackages) {
		const normalized = normalizePackageName(pkg);
		const npmRef = `${NPM_PREFIX}${normalized}`;
		if (!settings.packages.includes(npmRef)) {
			settings.packages.push(npmRef);
			added++;
		}
	}

	writePiSettings(settings);
	ctx.ui.setWorkingMessage();

	const addedPackages = [...selectedPackages].filter((p) => {
		const npmRef = `${NPM_PREFIX}${normalizePackageName(p)}`;
		return settings.packages?.includes(npmRef);
	});

	if (added > 0) {
		const installCmd = `pi install ${addedPackages.map((p) => `${NPM_PREFIX}${normalizePackageName(p)}`).join(" ")}`;
		ctx.ui.notify(
			`✓ Restored ${added} package(s) to settings:\n${addedPackages.map((p) => `  - npm:${normalizePackageName(p)}`).join("\n")}\n\nRun this command to install:\n  ${installCmd}`,
			"info",
		);
	} else {
		ctx.ui.notify("✓ All selected packages were already registered.", "info");
	}
}

async function handleConfig(ctx: ExtensionCommandContext): Promise<void> {
	const config = readGuardConfig();

	while (true) {
		const currentPath = config.backupPath || DEFAULT_BACKUP_PATH;
		const gistSyncStatus =
			config.gistEnabled === false ? "Disabled" : "Enabled";
		const ghInstalled = isGhInstalled();

		const options = [
			`[Path] Local backup: ${currentPath}${config.backupPath ? "" : " (default)"}`,
			`[Gist] ${config.gistId ? `https://gist.github.com/${config.gistId}` : "Not configured"}${ghInstalled ? "" : " (install gh CLI)"}`,
			ghInstalled ? "[Action] Create new GitHub Gist" : "",
			config.gistId && ghInstalled ? "[Action] Delete GitHub Gist" : "",
			config.gistId
				? `[Toggle] Auto-sync to Gist: ${gistSyncStatus}`
				: "[Toggle] Auto-sync: (set Gist ID first)",
			"[Back] Return to main menu",
		].filter(Boolean);

		const choice = await ctx.ui.select("Package Guard Configuration", options);

		if (choice === undefined || choice === "[Back] Return to main menu") {
			return;
		}

		switch (choice) {
			case `[Path] Local backup: ${currentPath}${config.backupPath ? "" : " (default)"}`: {
				const newPath = await ctx.ui.input(
					"Backup file path:",
					config.backupPath || DEFAULT_BACKUP_PATH,
				);
				if (newPath !== undefined) {
					const expandedPath = newPath.startsWith("~")
						? `${homedir()}${newPath.slice(1)}`
						: newPath;
					config.backupPath = expandedPath;
					writeGuardConfig(config);
					ctx.ui.notify("Backup path set", "info");
				}
				break;
			}

			case `[Gist] ${config.gistId ? `https://gist.github.com/${config.gistId}` : "Not configured"}${ghInstalled ? "" : " (install gh CLI)"}`: {
				if (!ghInstalled) {
					ctx.ui.notify(
						"GitHub CLI (gh) is not installed. Install it from https://cli.github.com",
						"error",
					);
					break;
				}
				const gistInput = await ctx.ui.input(
					"GitHub Gist ID or URL (empty to clear):",
					config.gistId ? `https://gist.github.com/${config.gistId}` : "",
				);
				if (gistInput !== undefined) {
					const trimmed = gistInput.trim();
					if (trimmed === "") {
						config.gistId = undefined;
					} else {
						config.gistId = extractGistId(trimmed);
					}
					writeGuardConfig(config);
					ctx.ui.notify(
						config.gistId ? "Gist configured" : "Gist cleared",
						"info",
					);
				}
				break;
			}

			case "[Action] Create new GitHub Gist": {
				if (!ghInstalled) {
					ctx.ui.notify(
						"GitHub CLI (gh) is not installed. Install it from https://cli.github.com",
						"error",
					);
					break;
				}
				ctx.ui.setWorkingMessage("Creating new gist...");
				const result = await createGist();
				ctx.ui.setWorkingMessage();
				if (result.success && result.gistId) {
					config.gistId = result.gistId;
					config.gistEnabled = true;
					writeGuardConfig(config);
					ctx.ui.notify(`Created and configured gist ${result.gistId}`, "info");
				} else {
					ctx.ui.notify(`Failed to create gist: ${result.error}`, "error");
				}
				break;
			}

			case "[Action] Delete GitHub Gist": {
				if (!config.gistId) {
					ctx.ui.notify("No gist configured to delete", "warning");
					break;
				}
				const confirmed = await ctx.ui.confirm(
					"Delete gist?",
					`This will permanently delete gist ${config.gistId}. This cannot be undone.`,
				);
				if (confirmed) {
					ctx.ui.setWorkingMessage("Deleting gist...");
					const result = await deleteGist(config.gistId);
					ctx.ui.setWorkingMessage();
					if (result.success) {
						config.gistId = undefined;
						config.gistEnabled = undefined;
						writeGuardConfig(config);
						ctx.ui.notify("Gist deleted and configuration cleared", "info");
					} else {
						ctx.ui.notify(`Failed to delete gist: ${result.error}`, "error");
					}
				}
				break;
			}

			case `[Toggle] Auto-sync to Gist: ${gistSyncStatus}`: {
				if (!config.gistId) {
					ctx.ui.notify(
						"Configure a Gist ID first before enabling/disabling sync",
						"warning",
					);
					break;
				}
				config.gistEnabled = config.gistEnabled === false;
				writeGuardConfig(config);
				ctx.ui.notify(
					`Gist sync ${config.gistEnabled ? "enabled" : "disabled"}`,
					"info",
				);
				break;
			}

			case "[Toggle] Auto-sync: (set Gist ID first)": {
				ctx.ui.notify(
					"Please configure a Gist ID first using the 'GitHub Gist' option",
					"warning",
				);
				break;
			}
		}
	}
}

async function showHelp(ctx: ExtensionCommandContext): Promise<void> {
	const helpText = `
# Package Guard

A lightweight pi extension that guards against the "orphaned package" trap.

## What It Does

1. **Check & Register**: Finds orphaned packages and registers them with pi
2. **Backup**: Save your package list locally or to a GitHub Gist
3. **Restore**: Recover packages from backup on a new machine
4. **Configure**: Set backup paths and GitHub Gist settings

## Usage

Run /package-guard to see the main menu with all options.

**When you install pi extensions via npm directly, they become "orphaned":**

  npm install -g pi-token-burden  Avoid this
  pi install npm:pi-token-burden  Use this instead

Orphaned packages are installed but not tracked by pi. This extension
detects and helps fix that automatically.
`;
	ctx.ui.notify(helpText, "info");
}

// ===========================================================================
// Unified Command: /package-guard
// ===========================================================================

export default function piPkgGuardExtension(pi: ExtensionAPI) {
	// ===========================================================================
	// Startup Check: Detect orphaned packages (max once per hour)
	// ===========================================================================

	pi.on("session_start", async (_event, ctx) => {
		const diff = analyzePackages();
		if (diff.hasOrphans) {
			ctx.ui.setStatus(
				STATUS_KEY,
				`${diff.orphaned.length} orphaned pi package(s). Run /package-guard`,
			);
		}
	});

	// ===========================================================================
	// Unified Command: /package-guard
	// ===========================================================================

	pi.registerCommand("package-guard", {
		description:
			"Package Guard - manage orphaned packages, backup, and restore",
		handler: async (_args, ctx) => {
			const choice = await ctx.ui.select("Package Guard - Main Menu", [
				"Scan: Find and register orphaned packages",
				"Backup: Save packages to local file + Gist",
				"Restore: Register packages from backup",
				"Settings: Configure backup path and Gist",
				"Help: How to use Package Guard",
			]);

			switch (choice) {
				case "Scan: Find and register orphaned packages":
					await handleRun(ctx);
					break;
				case "Backup: Save packages to local file + Gist":
					await handleBackup(ctx);
					break;
				case "Restore: Register packages from backup":
					await handleRestore(ctx);
					break;
				case "Settings: Configure backup path and Gist":
					await handleConfig(ctx);
					break;
				case "Help: How to use Package Guard":
					await showHelp(ctx);
					break;
			}
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
				`Use 'pi install npm:${packageName}' instead of 'npm install -g'`,
				"warning",
			);
		}
	});
}

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
