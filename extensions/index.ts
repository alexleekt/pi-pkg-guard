import { exec, execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { initializeI18n, t } from "./i18n/index.js";

// Initialize i18n with detected locale
initializeI18n();

// =============================================================================
// Constants
// =============================================================================

const SETTINGS_PATH = `${homedir()}/.pi/agent/settings.json`;
const NPM_PREFIX = "npm:";
const STATUS_KEY = "ext:pi-pkg-guard:v1";
const CONFIG_KEY = "pi-pkg-guard";
const CORE_PACKAGE = "@mariozechner/pi-coding-agent";
const SELF_PACKAGE = "pi-pkg-guard";
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

export function isPiSettings(value: unknown): value is PiSettings {
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

export function isGuardConfig(value: unknown): value is GuardConfig {
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

export function isBashToolInput(input: unknown): input is { command?: string } {
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
export function extractGistId(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/gist\.github\.com\/(?:.*\/)?([a-f0-9]+)/);
	return match ? match[1] : trimmed;
}

/**
 * Validate that a gist ID is safe to use in shell commands.
 * Only allows hexadecimal characters to prevent command injection.
 *
 * @param gistId - The gist ID to validate
 * @returns true if the gist ID is valid and safe
 */
export function isValidGistId(gistId: string): boolean {
	return /^[a-f0-9]+$/i.test(gistId);
}

/**
 * Validate that a backup path is safe to use for file operations.
 * Only allows paths within ~/.pi/agent/ or os.tmpdir() to prevent path traversal.
 *
 * @param backupPath - The path to validate
 * @returns true if the path is within allowed directories
 */
export function isValidBackupPath(backupPath: string): boolean {
	const resolvedPath = join(backupPath);
	const homeDir = homedir();
	const allowedDirs = [join(homeDir, ".pi", "agent"), tmpdir()];

	return allowedDirs.some(
		(allowedDir) =>
			resolvedPath === allowedDir || resolvedPath.startsWith(`${allowedDir}/`),
	);
}

/**
 * Remove npm: prefix from package name if present.
 */
export function normalizePackageName(pkg: string): string {
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
export function hasPiExtensionKeyword(
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

export function getNpmGlobalPackages(): string[] {
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
				// Exclude self (dev mode uses symlink, not npm)
				name !== SELF_PACKAGE &&
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

export function readPiSettings(): PiSettings {
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
export function analyzePackages(): PackageDiff {
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
export function syncOrphanedPackages(diff: PackageDiff): void {
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
	if (!isValidBackupPath(backupPath)) {
		throw new Error(
			`Invalid backup path: ${backupPath}. Path must be within ~/.pi/agent/ or a temporary directory.`,
		);
	}
	const data = createBackupData();
	writeFileSync(backupPath, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Check if gh CLI is installed.
 */
export function isGhInstalled(): boolean {
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
export async function syncGistBackup(
	gistId: string,
	data: BackupData,
): Promise<{ success: boolean; error?: string }> {
	if (!isValidGistId(gistId)) {
		return {
			success: false,
			error:
				"Invalid gist ID format. Gist IDs must be hexadecimal characters only.",
		};
	}

	if (!isGhInstalled()) {
		return {
			success: false,
			error:
				"GitHub CLI (gh) is not installed. Install it from https://cli.github.com or use the local backup only.",
		};
	}

	try {
		// Create temp file with the content
		const randomId = randomBytes(8).toString("hex");
		const tempFile = join(tmpdir(), `package-guard-backup-${randomId}.json`);
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
export async function createGist(): Promise<{
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
		const randomId = randomBytes(8).toString("hex");
		const tempFile = join(tmpdir(), `package-guard-create-${randomId}.json`);
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
export async function deleteGist(
	gistId: string,
): Promise<{ success: boolean; error?: string }> {
	if (!isValidGistId(gistId)) {
		return {
			success: false,
			error:
				"Invalid gist ID format. Gist IDs must be hexadecimal characters only.",
		};
	}

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
export async function getGistContent(
	gistId: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
	if (!isValidGistId(gistId)) {
		return {
			success: false,
			error:
				"Invalid gist ID format. Gist IDs must be hexadecimal characters only.",
		};
	}

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
		ctx.ui.notify(t("scan.no_orphans"), "info");
		return;
	}

	ctx.ui.notify(
		`${t("scan.found_orphans", {
			count: diff.orphaned.length,
		})}\n${diff.orphaned.map((p) => `  - ${p}`).join("\n")}`,
		"warning",
	);

	syncOrphanedPackages(diff);

	ctx.ui.notify(
		`${t("scan.success", { count: diff.orphaned.length })}:\n${diff.orphaned.map((p) => `  - npm:${p}`).join("\n")}${t("scan.reload_hint")}`,
		"info",
	);
}

async function handleBackup(ctx: ExtensionCommandContext): Promise<void> {
	const config = readGuardConfig();
	const data = createBackupData();
	const backupPath = config.backupPath || DEFAULT_BACKUP_PATH;

	ctx.ui.setWorkingMessage(t("backup.saving"));

	try {
		saveLocalBackup(backupPath);
		ctx.ui.notify(t("backup.local_success", { path: backupPath }), "info");
	} catch (error) {
		ctx.ui.setWorkingMessage();
		ctx.ui.notify(
			t("backup.local_error", {
				error: error instanceof Error ? error.message : String(error),
			}),
			"error",
		);
		return;
	}

	if (config.gistId && config.gistEnabled !== false) {
		ctx.ui.setWorkingMessage(t("backup.syncing_gist"));
		const result = await syncGistBackup(config.gistId, data);
		if (result.success) {
			ctx.ui.notify(
				t("backup.gist_success", { gistId: config.gistId }),
				"info",
			);
		} else {
			ctx.ui.notify(
				t("backup.gist_warning", { error: result.error || "" }),
				"warning",
			);
		}
	}

	ctx.ui.setWorkingMessage();
}

async function handleRestore(ctx: ExtensionCommandContext): Promise<void> {
	const config = readGuardConfig();
	const backupPath = config.backupPath || DEFAULT_BACKUP_PATH;

	// Validate custom backup paths (default path is always safe)
	if (config.backupPath && !isValidBackupPath(config.backupPath)) {
		ctx.ui.notify(
			t("restore.invalid_path", { path: config.backupPath }),
			"error",
		);
		return;
	}

	let backupData: BackupData | null = null;
	let backupSource = "local";

	ctx.ui.setWorkingMessage(t("restore.reading"));

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
		ctx.ui.notify(t("restore.no_backup"), "error");
		return;
	}

	ctx.ui.notify(
		t("restore.loaded", {
			source: backupSource,
			timestamp: backupData.timestamp,
		}),
		"info",
	);

	const currentRegistered = new Set(getRegisteredPackages());
	const packagesToRestore = backupData.registeredPackages.filter(
		(pkg) => !currentRegistered.has(pkg),
	);

	if (packagesToRestore.length === 0) {
		ctx.ui.notify(
			t("restore.all_registered", {
				count: backupData.registeredPackages.length,
			}),
			"info",
		);
		return;
	}

	ctx.ui.notify(
		`${t("restore.packages_available", { count: packagesToRestore.length })}:\n${packagesToRestore.map((p) => `  - ${p}`).join("\n")}`,
		"info",
	);

	const selectedPackages = new Set<string>();
	const remainingPackages = [...packagesToRestore];

	while (remainingPackages.length > 0) {
		const currentPkg = remainingPackages[0];
		const choice = await ctx.ui.select(
			t("restore.select_prompt", {
				current: packagesToRestore.length - remainingPackages.length + 1,
				total: packagesToRestore.length,
				packageName: currentPkg,
			}),
			[
				t("restore.option_include"),
				t("restore.option_skip"),
				t("restore.option_include_all"),
				t("restore.option_skip_all"),
			],
		);

		if (choice === t("restore.option_include")) {
			selectedPackages.add(currentPkg);
			remainingPackages.shift();
		} else if (choice === t("restore.option_skip")) {
			remainingPackages.shift();
		} else if (choice === t("restore.option_include_all")) {
			for (const pkg of remainingPackages) {
				selectedPackages.add(pkg);
			}
			break;
		} else if (choice === t("restore.option_skip_all")) {
			break;
		}
	}

	if (selectedPackages.size === 0) {
		ctx.ui.notify(t("restore.none_selected"), "info");
		return;
	}

	const confirmed = await ctx.ui.confirm(
		t("restore.confirm_title"),
		t("restore.confirm_message", { count: selectedPackages.size }),
	);

	if (!confirmed) {
		ctx.ui.notify(t("restore.cancelled"), "info");
		return;
	}

	ctx.ui.setWorkingMessage(t("restore.restoring"));

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
			`${t("restore.success", { count: added })}:\n${addedPackages.map((p) => `  - npm:${normalizePackageName(p)}`).join("\n")}${t("restore.install_hint", { command: installCmd })}`,
			"info",
		);
	} else {
		ctx.ui.notify(t("restore.already_registered"), "info");
	}
}

async function handleConfig(ctx: ExtensionCommandContext): Promise<void> {
	const config = readGuardConfig();

	while (true) {
		const currentPath = config.backupPath || DEFAULT_BACKUP_PATH;
		const isDefaultPath = !config.backupPath;
		const ghInstalled = isGhInstalled();

		const options = [
			t("config.path_label", { path: currentPath, isDefault: isDefaultPath }),
			t("config.gist_label", {
				gistId: config.gistId ?? "undefined",
				ghInstalled,
			}),
			ghInstalled ? t("config.action_create_gist") : "",
			config.gistId && ghInstalled ? t("config.action_delete_gist") : "",
			config.gistId
				? t("config.toggle_sync", {
						status:
							config.gistEnabled === false
								? t("config.sync_status_disabled")
								: t("config.sync_status_enabled"),
					})
				: t("config.toggle_sync_no_gist"),
			t("config.back"),
		].filter(Boolean);

		const choice = await ctx.ui.select(t("config.title"), options);

		if (choice === undefined || choice === t("config.back")) {
			return;
		}

		switch (choice) {
			case t("config.path_label", {
				path: currentPath,
				isDefault: isDefaultPath,
			}): {
				const newPath = await ctx.ui.input(
					t("config.input_backup_path"),
					config.backupPath || DEFAULT_BACKUP_PATH,
				);
				if (newPath !== undefined) {
					const expandedPath = newPath.startsWith("~")
						? `${homedir()}${newPath.slice(1)}`
						: newPath;
					config.backupPath = expandedPath;
					writeGuardConfig(config);
					ctx.ui.notify(t("config.path_set"), "info");
				}
				break;
			}

			case t("config.gist_label", {
				gistId: config.gistId ?? "undefined",
				ghInstalled,
			}): {
				if (!ghInstalled) {
					ctx.ui.notify(t("config.gist_gh_missing"), "error");
					break;
				}
				const gistInput = await ctx.ui.input(
					t("config.input_gist_id"),
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
						config.gistId ? t("config.gist_set") : t("config.gist_cleared"),
						"info",
					);
				}
				break;
			}

			case t("config.action_create_gist"): {
				if (!ghInstalled) {
					ctx.ui.notify(t("config.gist_gh_missing"), "error");
					break;
				}
				ctx.ui.setWorkingMessage(t("config.creating_gist"));
				const result = await createGist();
				ctx.ui.setWorkingMessage();
				if (result.success && result.gistId) {
					config.gistId = result.gistId;
					config.gistEnabled = true;
					writeGuardConfig(config);
					ctx.ui.notify(
						t("config.gist_created", { gistId: result.gistId }),
						"info",
					);
				} else {
					ctx.ui.notify(
						t("config.gist_create_failed", { error: result.error || "" }),
						"error",
					);
				}
				break;
			}

			case t("config.action_delete_gist"): {
				if (!config.gistId) {
					ctx.ui.notify(t("config.no_gist_to_delete"), "warning");
					break;
				}
				const confirmed = await ctx.ui.confirm(
					t("config.delete_confirm_title"),
					t("config.delete_confirm_message", { gistId: config.gistId }),
				);
				if (confirmed) {
					ctx.ui.setWorkingMessage(t("config.deleting_gist"));
					const result = await deleteGist(config.gistId);
					ctx.ui.setWorkingMessage();
					if (result.success) {
						config.gistId = undefined;
						config.gistEnabled = undefined;
						writeGuardConfig(config);
						ctx.ui.notify(t("config.gist_deleted"), "info");
					} else {
						ctx.ui.notify(
							t("config.gist_delete_failed", { error: result.error || "" }),
							"error",
						);
					}
				}
				break;
			}

			case t("config.toggle_sync", {
				status:
					config.gistEnabled === false
						? t("config.sync_status_disabled")
						: t("config.sync_status_enabled"),
			}): {
				if (!config.gistId) {
					ctx.ui.notify(t("config.sync_need_gist"), "warning");
					break;
				}
				config.gistEnabled = config.gistEnabled === false;
				writeGuardConfig(config);
				ctx.ui.notify(
					config.gistEnabled
						? t("config.sync_enabled")
						: t("config.sync_disabled"),
					"info",
				);
				break;
			}

			case t("config.toggle_sync_no_gist"): {
				ctx.ui.notify(t("config.sync_need_gist"), "warning");
				break;
			}
		}
	}
}

async function showHelp(ctx: ExtensionCommandContext): Promise<void> {
	const lines = [
		`# ${t("help.title")}`,
		"",
		t("help.description"),
		"",
		`## ${t("help.what_it_does")}`,
		...(t("help.features") as string[]),
		"",
		`## ${t("help.usage")}`,
		"",
		t("help.avoid_orphans"),
		"",
		`  ${t("help.avoid_command")}`,
		`  ${t("help.preferred_command")}`,
		"",
		t("help.explanation"),
	];
	ctx.ui.notify(lines.join("\n"), "info");
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
				t("status.orphaned_packages", { count: diff.orphaned.length }),
			);
		}
	});

	// ===========================================================================
	// Unified Command: /package-guard
	// ===========================================================================

	pi.registerCommand("package-guard", {
		description: t("command.description"),
		handler: async (_args, ctx) => {
			const choice = await ctx.ui.select(t("menu.title"), [
				t("menu.scan"),
				t("menu.backup"),
				t("menu.restore"),
				t("menu.settings"),
				t("menu.help"),
			]);

			switch (choice) {
				case t("menu.scan"):
					await handleRun(ctx);
					break;
				case t("menu.backup"):
					await handleBackup(ctx);
					break;
				case t("menu.restore"):
					await handleRestore(ctx);
					break;
				case t("menu.settings"):
					await handleConfig(ctx);
					break;
				case t("menu.help"):
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
			ctx.ui.notify(t("npm_guard.warning", { packageName }), "warning");
		}
	});
}

// Detect npm install with -g or --global and a pi-* package
export const NPM_GLOBAL_PATTERN =
	/npm\s+(?:install|i)(?:\s+\S+)*\s+(?:-g|--global)\b/;
// Matches: pi-foo (start), lsp-pi (end), @scope/pi-foo (scoped), @scope/lsp-pi (scoped with suffix)
export const PI_PACKAGE_PATTERN =
	/(?:^|\s|\/)pi-[a-z0-9-]+|(?:^|\s|\/)[a-z0-9-]+-pi(?:\s|$|@)/;

/**
 * Check if a bash command is a global npm install of a pi package.
 */
export function isGlobalPiInstall(command: string): {
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
