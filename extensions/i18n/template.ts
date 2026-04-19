/**
 * Translation Template for pi-pkg-guard
 *
 * This is a template for adding a new language.
 * Copy this file, rename it to {locale}.ts, and translate all strings.
 *
 * Language: [Your Language Name]
 * Locale: [e.g., es-ES, de-DE, ja-JP]
 */

import type { TranslationDict } from "./types.js";

export const LOCALE_TEMPLATE: TranslationDict = {
	// Startup / Status messages
	"status.orphaned_packages":
		"{count, plural, one {# orphaned pi package} other {# orphaned pi packages}}. Run /package-guard",

	// npm Guard
	"npm_guard.warning":
		"Use 'pi install npm:{packageName}' instead of 'npm install -g'",

	// Command menu
	"menu.title": "Package Guard - Main Menu",
	"menu.scan": "Scan: Find and register orphaned packages",
	"menu.backup": "Backup: Save packages to local file + Gist",
	"menu.restore": "Restore: Register packages from backup",
	"menu.settings": "Settings: Configure backup path and Gist",
	"menu.help": "Help: How to use Package Guard",

	// Scan / Run
	"scan.no_orphans":
		"✓ All pi packages are registered. No orphaned packages found.",
	"scan.found_orphans":
		"Found {count} orphaned {count, plural, one {package} other {packages}}:",
	"scan.success":
		"✓ Registered {count} orphaned {count, plural, one {package} other {packages}} with pi:",
	"scan.reload_hint": "\n\nRun /reload to activate the registered packages.",

	// Backup
	"backup.saving": "Saving backup...",
	"backup.local_success": "✓ Local backup saved:\n  {path}",
	"backup.local_error": "✗ Failed to save backup:\n{error}",
	"backup.syncing_gist": "Syncing to GitHub Gist...",
	"backup.gist_success":
		"✓ Synced to GitHub Gist:\n  https://gist.github.com/{gistId}",
	"backup.gist_warning": "✓ Local backup saved\n⚠ Gist sync failed:\n{error}",
	"backup.gist_failed": "Failed to sync gist: {error}",

	// Restore
	"restore.reading": "Reading backup...",
	"restore.no_backup":
		"✗ No backup found.\n\nRun Backup first to create a backup.",
	"restore.loaded": "✓ Loaded backup from {source}:\n  {timestamp}",
	"restore.all_registered":
		"✓ All {count} {count, plural, one {package} other {packages}} from backup are already registered.\n\nNo restore needed.",
	"restore.packages_available":
		"{count} {count, plural, one {package} other {packages}} from backup not currently registered:",
	"restore.select_prompt": "Package {current} of {total}: {packageName}",
	"restore.option_include": "Include this package",
	"restore.option_skip": "Skip this package",
	"restore.option_include_all": "Include all remaining",
	"restore.option_skip_all": "Skip all remaining",
	"restore.none_selected": "No packages selected for restore",
	"restore.confirm_title": "Restore selected packages?",
	"restore.confirm_message":
		"This will register {count} {count, plural, one {package} other {packages}} with pi.",
	"restore.restoring": "Restoring packages...",
	"restore.cancelled": "Restore cancelled",
	"restore.success":
		"✓ Restored {count} {count, plural, one {package} other {packages}} to settings:",
	"restore.already_registered":
		"✓ All selected packages were already registered.",
	"restore.install_hint": "\n\nRun this command to install:\n  {command}",

	// Settings / Config
	"config.title": "Package Guard Configuration",
	"config.path_label":
		"[Path] Local backup: {path}{isDefault, select, true { (default)} other {}}",
	"config.path_default": " (default)",
	"config.gist_label":
		"[Gist] {gistId, select, undefined {Not configured} other {https://gist.github.com/{gistId}}}{ghInstalled, select, false { (install gh CLI)} other {}}",
	"config.gist_not_configured": "Not configured",
	"config.gist_gh_missing": " (install gh CLI)",
	"config.action_create_gist": "[Action] Create new GitHub Gist",
	"config.action_delete_gist": "[Action] Delete GitHub Gist",
	"config.toggle_sync": "[Toggle] Auto-sync to Gist: {status}",
	"config.sync_status_enabled": "Enabled",
	"config.sync_status_disabled": "Disabled",
	"config.toggle_sync_no_gist": "[Toggle] Auto-sync: (set Gist ID first)",
	"config.sync_need_gist":
		"Please configure a Gist ID first using the 'GitHub Gist' option",
	"config.input_backup_path": "Backup file path:",
	"config.input_gist_id": "GitHub Gist ID or URL (empty to clear):",
	"config.path_set": "Backup path set",
	"config.gist_set": "Gist configured",
	"config.gist_cleared": "Gist cleared",
	"config.creating_gist": "Creating new gist...",
	"config.gist_created": "Created and configured gist {gistId}",
	"config.gist_create_failed": "Failed to create gist: {error}",
	"config.delete_confirm_title": "Delete gist?",
	"config.delete_confirm_message":
		"This will permanently delete gist {gistId}. This cannot be undone.",
	"config.deleting_gist": "Deleting gist...",
	"config.gist_deleted": "Gist deleted and configuration cleared",
	"config.gist_delete_failed": "Failed to delete gist: {error}",
	"config.no_gist_to_delete": "No gist configured to delete",
	"config.sync_enabled": "Gist sync enabled",
	"config.sync_disabled": "Gist sync disabled",
	"config.back": "[Back] Return to main menu",

	// Help
	"help.title": "# Package Guard",
	"help.description":
		'A lightweight pi extension that guards against the "orphaned package" trap.',
	"help.what_it_does": "## What It Does",
	"help.features": [
		"1. **Check & Register**: Finds orphaned packages and registers them with pi",
		"2. **Backup**: Save your package list locally or to a GitHub Gist",
		"3. **Restore**: Recover packages from backup on a new machine",
		"4. **Configure**: Set backup paths and GitHub Gist settings",
	],
	"help.usage": "## Usage",
	"help.avoid_orphans":
		'**When you install pi extensions via npm directly, they become "orphaned":**',
	"help.preferred_command": "pi install npm:pi-token-burden  Use this instead",
	"help.avoid_command": "npm install -g pi-token-burden  Avoid this",
	"help.explanation":
		"Orphaned packages are installed but not tracked by pi. This extension\ndetects and helps fix that automatically.",

	// Command registration
	"command.description":
		"Package Guard - manage orphaned packages, backup, and restore",
};
