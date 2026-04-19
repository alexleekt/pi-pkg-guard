/**
 * i18n Types for pi-pkg-guard
 *
 * Type-safe internationalization with ICU MessageFormat support.
 * Default language: English (United States)
 */

export interface TranslationDict {
	// Startup / Status messages
	"status.orphaned_packages": string;

	// npm Guard
	"npm_guard.warning": string;

	// Command menu
	"menu.title": string;
	"menu.scan": string;
	"menu.backup": string;
	"menu.restore": string;
	"menu.settings": string;
	"menu.help": string;

	// Scan / Run
	"scan.no_orphans": string;
	"scan.found_orphans": string;
	"scan.success": string;
	"scan.reload_hint": string;

	// Backup
	"backup.saving": string;
	"backup.local_success": string;
	"backup.local_error": string;
	"backup.syncing_gist": string;
	"backup.gist_success": string;
	"backup.gist_warning": string;

	// Restore
	"restore.reading": string;
	"restore.invalid_path": string;
	"restore.invalid_backup": string;
	"restore.no_backup": string;
	"restore.loaded": string;
	"restore.exclusions_prompt": string;
	"restore.exclusions_yes": string;
	"restore.exclusions_no": string;
	"restore.exclusions_added": string;
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

	// Settings / Config
	"config.title": string;
	"config.path_label": string;
	"config.gist_label": string;
	"config.gist_gh_missing": string;
	"config.action_create_gist": string;
	"config.action_delete_gist": string;
	"config.toggle_sync": string;
	"config.sync_status_enabled": string;
	"config.sync_status_disabled": string;
	"config.toggle_sync_no_gist": string;
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
	"config.back": string;

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
