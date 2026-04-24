/**
 * English (United States) translations for pi-pkg-guard
 *
 * Uses ICU MessageFormat for interpolation.
 * See: https://unicode-org.github.io/icu/userguide/format_parse/messages/
 */

import type { TranslationDict } from "./types.js";

export const en_US: TranslationDict = {
	// Startup / Status messages
	"status.unregistered_packages":
		"{count, plural, one {# unregistered pi package} other {# unregistered pi packages}}. Run /package-guard",
	"status.all_registered": "✓ All pi packages are registered",

	// npm Guard
	"npm_guard.warning":
		"Use 'pi install npm:{packageName}' instead of 'npm install -g'",

	// Command menu
	"menu.title": "Package Guard",
	"menu.scan": "Find unregistered packages",
	"menu.backup": "Save backup to file + Gist",
	"menu.restore": "Restore packages from backup",
	"menu.change_path": "Change where backups are saved",
	"menu.gist_create": "Set up new GitHub Gist backup",
	"menu.gist_use": "Connect to existing Gist",
	"menu.gist_change": "Switch to a different Gist",
	"menu.gist_delete": "Remove Gist backup",
	"menu.toggle_sync": "{status} automatic Gist sync",
	"menu.sync_enabled": "Disable",
	"menu.sync_disabled": "Enable",
	"menu.help": "Show help and usage info",
	"menu.exit": "Exit",

	// Scan / Run
	"scan.no_unregistered":
		"✓ All pi packages are registered. No unregistered packages found.",
	"scan.found_unregistered":
		"Found {count} unregistered {count, plural, one {package} other {packages}}:",
	"scan.success":
		"✓ Registered {count} unregistered {count, plural, one {package} other {packages}} with pi:",
	"scan.reload_hint": "\n\nRun /reload to activate the registered packages.",
	"scan.analyzing": "Scanning npm packages...",
	"scan.reload_now": "[Reload now] Activate registered packages",
	"scan.reload_later": "[Later] I'll reload manually",

	// Backup
	"backup.saving": "Saving backup...",
	"backup.local_success": "✓ Local backup saved:\n  {path}",
	"backup.local_error": "✗ Failed to save backup:\n{error}",
	"backup.syncing_gist": "Syncing to GitHub Gist...",
	"backup.gist_success":
		"✓ Synced to GitHub Gist:\n  https://gist.github.com/{gistId}",
	"backup.gist_warning": "✓ Local backup saved\n✗ Gist sync failed:\n{error}",
	"backup.gist_skipped": "✓ Local backup saved (Gist sync not configured)",
	"backup.gist_url_missing": "Gist URL not configured",

	// Restore
	"restore.reading": "Reading backup...",
	"restore.local_failed_trying_gist":
		"Local backup not found, trying GitHub Gist...",
	"restore.invalid_path":
		"✗ Invalid backup path: {path}.\n\nPath must be within ~/.pi/agent/ or a temporary directory.",
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

	// Settings / Config (input prompts, notifications, and feedback messages)
	"config.gist_gh_missing": " (install gh CLI)",
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

	// Help
	"help.title": "# Package Guard",
	"help.description":
		'A lightweight pi extension that guards against the "unregistered package" trap.',
	"help.what_it_does": "## What It Does",
	"help.features": [
		"1. **Check & Register**: Finds unregistered packages and registers them with pi",
		"2. **Backup**: Save your package list locally or to a GitHub Gist",
		"3. **Restore**: Recover packages from backup on a new machine",
		"4. **Configure**: Set backup paths and GitHub Gist settings",
	],
	"help.usage": "## Usage",
	"help.avoid_unregistered":
		'**When you install pi extensions via npm directly, they become "unregistered":**',
	"help.preferred_command": "pi install npm:pi-token-burden  Use this instead",
	"help.avoid_command": "npm install -g pi-token-burden  Avoid this",
	"help.explanation":
		"Unregistered packages are installed but not tracked by pi. This extension\ndetects and helps fix that automatically.",

	// Command registration
	"command.description":
		"Package Guard - manage unregistered packages, backup, and restore",
};
