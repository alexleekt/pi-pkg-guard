/**
 * i18n Types for pi-pkg-guard
 *
 * Type-safe internationalization with ICU MessageFormat support.
 * Default language: English (United States)
 */

export interface TranslationDict {
	// Startup / Status messages
	"status.orphaned_packages": string;
	"status.all_registered": string;

	// npm Guard
	"npm_guard.warning": string;

	// Command menu
	"menu.title": string;
	"menu.scan": string;
	"menu.backup": string;
	"menu.restore": string;
	"menu.change_path": string;
	"menu.gist_create": string;
	"menu.gist_use": string;
	"menu.gist_change": string;
	"menu.gist_delete": string;
	"menu.toggle_sync": string;
	"menu.sync_enabled": string;
	"menu.sync_disabled": string;
	"menu.help": string;
	"menu.exit": string;

	// Scan / Run
	"scan.no_orphans": string;
	"scan.found_orphans": string;
	"scan.success": string;
	"scan.reload_hint": string;
	"scan.analyzing": string;
	"scan.reload_now": string;
	"scan.reload_later": string;

	// Backup
	"backup.saving": string;
	"backup.local_success": string;
	"backup.local_error": string;
	"backup.syncing_gist": string;
	"backup.gist_success": string;
	"backup.gist_warning": string;
	"backup.gist_skipped": string;
	"backup.gist_url_missing": string;

	// Restore
	"restore.reading": string;
	"restore.local_failed_trying_gist": string;
	"restore.invalid_path": string;
	"restore.no_backup": string;
	"restore.loaded": string;
	"restore.all_registered": string;
	"restore.packages_available": string;
	"restore.select_prompt": string;
	"restore.option_include": string;
	"restore.option_skip": string;
	"restore.option_include_all": string;
	"restore.option_skip_all": string;
	"restore.none_selected": string;
	"restore.confirm_title": string;
	"restore.confirm_message": string;
	"restore.restoring": string;
	"restore.cancelled": string;
	"restore.success": string;
	"restore.already_registered": string;
	"restore.install_hint": string;

	// Settings / Config (input prompts, notifications, and feedback messages)
	"config.gist_gh_missing": string;
	"config.sync_need_gist": string;
	"config.input_backup_path": string;
	"config.input_gist_id": string;
	"config.path_set": string;
	"config.gist_set": string;
	"config.gist_cleared": string;
	"config.creating_gist": string;
	"config.gist_created": string;
	"config.gist_create_failed": string;
	"config.delete_confirm_title": string;
	"config.delete_confirm_message": string;
	"config.deleting_gist": string;
	"config.gist_deleted": string;
	"config.gist_delete_failed": string;
	"config.no_gist_to_delete": string;
	"config.sync_enabled": string;
	"config.sync_disabled": string;

	// Help
	"help.title": string;
	"help.description": string;
	"help.what_it_does": string;
	"help.features": string[];
	"help.usage": string;
	"help.avoid_orphans": string;
	"help.preferred_command": string;
	"help.avoid_command": string;
	"help.explanation": string;

	// Command registration
	"command.description": string;
}

export type TranslationKey = keyof TranslationDict;

export interface I18nConfig {
	locale: string;
	translations: Record<string, Partial<TranslationDict>>;
}

export type InterpolationValues = Record<string, string | number | boolean>;
