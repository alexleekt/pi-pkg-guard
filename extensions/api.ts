/**
 * Public API for pi-pkg-guard
 *
 * Clean, organized exports for developers using this extension programmatically.
 * All internal implementation details (command handlers, UI logic) are excluded.
 *
 * @example
 * ```typescript
 * import {
 *   isPiSettings,
 *   isBackupData,
 *   extractGistId,
 *   analyzePackages,
 *   syncOrphanedPackages,
 * } from "pi-pkg-guard/extensions/api.js";
 *
 * // Validate settings
 * const settings = { packages: ["pi-foo"] };
 * if (isPiSettings(settings)) {
 *   console.log("Valid settings");
 * }
 *
 * // Validate backup data
 * const backup = {
 *   timestamp: "2026-04-23",
 *   npmPackages: ["pi-foo"],
 *   registeredPackages: [],
 *   orphanedPackages: ["pi-foo"]
 * };
 * if (isBackupData(backup)) {
 *   console.log("Valid backup structure");
 * }
 *
 * // Analyze packages
 * const diff = analyzePackages();
 * if (diff.hasOrphans) {
 *   console.log(`Found ${diff.orphaned.length} orphaned packages`);
 *   syncOrphanedPackages(diff);
 * }
 * ```
 */

// Type Guards - Runtime validation
export {
	isBackupData,
	isBashToolInput,
	isGuardConfig,
	isPiSettings,
	validateGuardConfig,
} from "./index.js";

// Validation utilities
export {
	extractGistId,
	isValidGistId,
	isValidBackupPath,
} from "./index.js";

// Package utilities
export {
	normalizePackageName,
	hasPiExtensionKeyword,
} from "./index.js";

// Package analysis
export {
	getNpmGlobalPackages,
	readPiSettings,
	analyzePackages,
	syncOrphanedPackages,
} from "./index.js";

// Gist operations
export {
	isGhInstalled,
	syncGistBackup,
	createGist,
	deleteGist,
	getGistContent,
} from "./index.js";

// Types
export type {
	PackageDiff,
	PiSettings,
	GuardConfig,
	BackupData,
	ConfigValidationResult,
} from "./index.js";
