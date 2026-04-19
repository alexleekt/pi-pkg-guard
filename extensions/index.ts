import { exec, execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const { version: EXTENSION_VERSION } = require("../package.json");

const execAsync = promisify(exec);
import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { initializeI18n, t } from "./i18n/index.js";

// Initialize i18n with detected locale
initializeI18n();

// =============================================================================
// Error Handling Utilities
// =============================================================================

/**
 * Check if an error is an expected "file not found" error.
 * Used to distinguish between expected failures (optional file reads)
 * and unexpected errors (permissions, corruption, etc.).
 */
function isFileNotFoundError(error: unknown): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error.code === "ENOENT" || error.code === "ENOTDIR")
	);
}

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

const BACKUP_DATA_SCHEMA_URL = `https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/v${EXTENSION_VERSION}/schema/backup-data.json`;

// Accept schema URLs from any version tag, main branch, or refs/tags pattern
// This ensures backward compatibility as the schema evolves
const ALLOWED_SCHEMA_URL_PATTERNS = [
	// Current version (exact match)
	BACKUP_DATA_SCHEMA_URL,
	// Any version tag (vX.Y.Z)
	/^https:\/\/raw\.githubusercontent\.com\/alexleekt\/pi-pkg-guard\/v\d+\.\d+\.\d+\/schema\/backup-data\.json$/,
	// refs/tags pattern (any tag)
	/^https:\/\/raw\.githubusercontent\.com\/alexleekt\/pi-pkg-guard\/refs\/tags\/v\d+\.\d+\.\d+\/schema\/backup-data\.json$/,
	// Main branch (for backward compatibility with dev versions)
	"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/refs/heads/main/schema/backup-data.json",
	"https://raw.githubusercontent.com/alexleekt/pi-pkg-guard/main/schema/backup-data.json",
];

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
	excludedPackages?: string[];
}

interface BackupData {
	$schema: string;
	timestamp: string;
	npmPackages: string[];
	excludedPackages?: string[];
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
	if (
		candidate.excludedPackages !== undefined &&
		(!Array.isArray(candidate.excludedPackages) ||
			!candidate.excludedPackages.every((p) => typeof p === "string"))
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
// Schema and Validation
// =============================================================================

interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validate backup data against the expected schema.
 * This is a runtime validator that checks structure without external dependencies.
 */
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
	} catch (error) {
		// Package.json not found - fall back to name-only detection (expected for some packages)
		// Log unexpected errors (permissions, JSON parse errors) for debugging
		if (!isFileNotFoundError(error)) {
			console.warn(
				`[pi-pkg-guard] Unexpected error reading package.json for ${packageName}:`,
				error,
			);
		}
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

		// Read excluded packages from config
		const config = readGuardConfig();
		const excludedPackages = new Set<string>([CORE_PACKAGE, SELF_PACKAGE]);
		if (config.excludedPackages) {
			for (const pkg of config.excludedPackages) {
				excludedPackages.add(pkg);
			}
		}

		return Object.keys(deps).filter(
			(name) =>
				// Exclude configured packages (core, self, and user-defined)
				!excludedPackages.has(name) &&
				// Match name patterns: pi-*, *-pi, @scope/pi-*
				PI_NAME_PATTERN.test(name) &&
				// Validate via package.json keywords (local read, no network)
				hasPiExtensionKeyword(nodeModulesPath, name),
		);
	} catch (error) {
		// npm list can fail for various reasons (npm not installed, no global packages)
		// Log error for debugging but return empty array - this is non-critical
		console.warn("[pi-pkg-guard] Failed to get npm global packages:", error);
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
	} catch (error) {
		// File doesn't exist - return empty settings (expected on first run)
		// Log unexpected errors (permissions, corruption) for debugging
		if (!isFileNotFoundError(error)) {
			console.warn("[pi-pkg-guard] Unexpected error reading settings:", error);
		}
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
	} catch (error) {
		// Settings read failures are already logged by readPiSettings()
		// Guard config failures are typically type validation issues
		console.warn("[pi-pkg-guard] Failed to read guard config:", error);
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
 * Get version from package.json
 */
export function getExtensionVersion(): string {
	try {
		// Extension is at extensions/index.ts, package.json is one level up
		const pkgPath = new URL("../package.json", import.meta.url);
		const content = readFileSync(pkgPath, "utf-8");
		const pkg = JSON.parse(content) as { version?: string };
		return pkg.version || "unknown";
	} catch (error) {
		// Package.json should always exist - log unexpected errors
		console.warn(
			"[pi-pkg-guard] Unexpected error reading extension version:",
			error,
		);
		return "unknown";
	}
}

/**
 * Create backup data object with current package state.
 */
function createBackupData(): BackupData {
	const npmPackages = getNpmGlobalPackages();
	const config = readGuardConfig();

	return {
		$schema: BACKUP_DATA_SCHEMA_URL,
		timestamp: new Date().toISOString(),
		npmPackages,
		excludedPackages: config.excludedPackages,
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

	let localSuccess = false;
	try {
		saveLocalBackup(backupPath);
		localSuccess = true;
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

	// If Gist sync is enabled, do it before showing any success message
	if (config.gistId && config.gistEnabled !== false) {
		ctx.ui.setWorkingMessage(t("backup.syncing_gist"));
		const result = await syncGistBackup(config.gistId, data);
		ctx.ui.setWorkingMessage();

		if (result.success && localSuccess) {
			// Both succeeded - show combined message
			ctx.ui.notify(
				`${t("backup.local_success", { path: backupPath })}
\n${t("backup.gist_success", { gistId: config.gistId })}`,
				"info",
			);
		} else if (!result.success) {
			// Local succeeded, Gist failed - show warning with both statuses
			ctx.ui.notify(
				t("backup.gist_warning", { error: result.error || "" }),
				"warning",
			);
		}
	} else {
		// No Gist sync - just show local success
		ctx.ui.setWorkingMessage();
		ctx.ui.notify(t("backup.local_success", { path: backupPath }), "info");
	}
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
	let validationError: string | null = null;

	ctx.ui.setWorkingMessage(t("restore.reading"));

	try {
		const content = readFileSync(backupPath, "utf-8");
		const parsed = JSON.parse(content) as unknown;
		const validation = validateBackupData(parsed);
		if (validation.valid) {
			backupData = parsed as BackupData;
		} else {
			validationError = validation.errors.join("; ");
		}
	} catch {
		// Local backup failed, will try gist
	}

	if (!backupData && config.gistId && isGhInstalled()) {
		try {
			const result = await getGistContent(config.gistId);
			if (result.success && result.content) {
				const parsed = JSON.parse(result.content) as unknown;
				const validation = validateBackupData(parsed);
				if (validation.valid) {
					backupData = parsed as BackupData;
					backupSource = "gist";
				} else {
					validationError = validation.errors.join("; ");
				}
			}
		} catch {
			// Gist backup failed too
		}
	}

	ctx.ui.setWorkingMessage();

	if (!backupData) {
		if (validationError) {
			ctx.ui.notify(
				t("restore.invalid_backup", { error: validationError }),
				"error",
			);
		} else {
			ctx.ui.notify(t("restore.no_backup"), "error");
		}
		return;
	}

	ctx.ui.notify(
		t("restore.loaded", {
			source: backupSource,
			timestamp: backupData.timestamp,
		}),
		"info",
	);

	// Handle excluded packages from backup
	if (backupData.excludedPackages && backupData.excludedPackages.length > 0) {
		const currentConfig = readGuardConfig();
		const currentExcluded = new Set(currentConfig.excludedPackages || []);
		const newExclusions = backupData.excludedPackages.filter(
			(pkg) => !currentExcluded.has(pkg),
		);

		if (newExclusions.length > 0) {
			const choice = await ctx.ui.select(
				t("restore.exclusions_prompt", {
					count: String(newExclusions.length),
					packages: newExclusions.map((p) => `  - ${p}`).join("\n"),
				}),
				[t("restore.exclusions_yes"), t("restore.exclusions_no")],
			);

			if (choice === t("restore.exclusions_yes")) {
				currentConfig.excludedPackages = [
					...(currentConfig.excludedPackages || []),
					...newExclusions,
				];
				writeGuardConfig(currentConfig);
				ctx.ui.notify(
					t("restore.exclusions_added", {
						count: String(newExclusions.length),
					}),
					"info",
				);
			}
		}
	}

	const currentRegistered = new Set(getRegisteredPackages());
	const packagesToRestore = backupData.npmPackages.filter(
		(pkg) => !currentRegistered.has(pkg),
	);

	if (packagesToRestore.length === 0) {
		ctx.ui.notify(
			t("restore.all_registered", {
				count: String(backupData.npmPackages.length),
			}),
			"info",
		);
		return;
	}

	ctx.ui.notify(
		`${t("restore.packages_available", { count: String(packagesToRestore.length) })}:\n${packagesToRestore.map((p) => `  - ${p}`).join("\n")}`,
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
			const choice = await ctx.ui.select(
				t("menu.title", { version: getExtensionVersion() }),
				[
					t("menu.scan"),
					t("menu.backup"),
					t("menu.restore"),
					t("menu.settings"),
					t("menu.help"),
				],
			);

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
