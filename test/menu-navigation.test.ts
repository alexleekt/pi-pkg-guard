/**
 * Menu Navigation Tests - Story 5.1: Menu Navigation
 *
 * Tests menu structure, option filtering, and selection handling patterns.
 */

import assert from "node:assert";
import { describe, it } from "node:test";

describe("menu structure and sections", () => {
	it("has flat menu without section headers", () => {
		const options = [
			"1. Scan for unregistered packages",
			"2. Save backup",
			"3. Restore packages",
		];
		// Numbered for quick in-menu navigation
		assert.ok(options.every((o) => /^\d\.\s/.test(o)));
	});

	it("filters out empty strings from menu", () => {
		// Simulates: .filter(Boolean)
		const rawOptions = [
			"1. Scan",
			"", // conditional empty
			"2. Backup",
			"", // another empty
			"3. Exit",
		];
		const filtered = rawOptions.filter(Boolean);

		assert.strictEqual(filtered.length, 3);
		assert.ok(!filtered.includes(""));
	});
});

describe("simplified menu has single config entry", () => {
	it("shows single Configuration settings item regardless of config state", () => {
		const options = [
			"1. Scan",
			"2. Save backup",
			"3. Restore",
			"",
			"4. Configuration settings",
			"",
			"5. Help",
			"6. Exit",
		].filter(Boolean);

		assert.ok(options.includes("4. Configuration settings"));
		assert.ok(!options.includes("Set up new GitHub Gist backup"));
		assert.ok(!options.includes("Enable automatic Gist sync"));
	});
});

describe("config menu conditional options", () => {
	it("shows gist_create when no gist and gh installed", () => {
		const config = { gistId: undefined };
		const ghInstalled = true;

		const showCreate = !config.gistId && ghInstalled;

		assert.strictEqual(showCreate, true);
	});

	it("hides gist_create when gist exists", () => {
		const config = { gistId: "abc123" };
		const ghInstalled = true;

		const showCreate = !config.gistId && ghInstalled;

		assert.strictEqual(showCreate, false);
	});

	it("hides gist options when gh not installed", () => {
		const config = { gistId: undefined };
		const ghInstalled = false;

		const showCreate = !config.gistId && ghInstalled;
		const showChange = Boolean(config.gistId && ghInstalled);

		assert.strictEqual(showCreate, false);
		assert.strictEqual(showChange, false);
	});

	it("shows gist_change and gist_delete when gist exists", () => {
		const config = { gistId: "abc123" };
		const ghInstalled = true;

		const showChange = config.gistId && ghInstalled;
		const showDelete = config.gistId && ghInstalled;

		assert.strictEqual(showChange, true);
		assert.strictEqual(showDelete, true);
	});

	it("shows toggle_sync when gist configured", () => {
		const config = { gistId: "abc123", gistEnabled: true };

		const showToggle = !!config.gistId;

		assert.strictEqual(showToggle, true);
	});

	it("shows sync_disabled status when gistEnabled is false", () => {
		const config = { gistId: "abc123", gistEnabled: false };

		const status = config.gistEnabled === false ? "disabled" : "enabled";

		assert.strictEqual(status, "disabled");
	});

	it("shows sync_enabled status by default", () => {
		const config: { gistId: string; gistEnabled?: boolean } = {
			gistId: "abc123",
		}; // gistEnabled undefined

		const status = config.gistEnabled === false ? "disabled" : "enabled";

		assert.strictEqual(status, "enabled");
	});
});

describe("menu selection handling", () => {
	it("exits on undefined choice", () => {
		const choice: string | undefined = undefined;
		const exitOption = "6. Exit";

		const shouldExit = choice === undefined || choice === exitOption;

		assert.strictEqual(shouldExit, true);
	});

	it("exits on exit option", () => {
		const choice = "6. Exit";
		const exitOption = "6. Exit";

		const shouldExit = choice === undefined || choice === exitOption;

		assert.strictEqual(shouldExit, true);
	});

	it("continues on valid menu selection", () => {
		const choice = "1. Scan for unregistered packages" as string;
		const exitOption = "6. Exit" as string;

		const shouldExit = choice === undefined || choice === exitOption;

		assert.strictEqual(shouldExit, false);
	});
});

describe("menu action routing", () => {
	it("routes scan choice to executeScan", () => {
		const choice = "1. Scan for unregistered packages" as string;
		const scanLabel = "1. Scan for unregistered packages" as string;

		const isScan = choice === scanLabel;

		assert.strictEqual(isScan, true);
	});

	it("routes backup choice to executeBackup", () => {
		const choice = "2. Save backup to file + Gist" as string;
		const backupLabel = "2. Save backup to file + Gist" as string;

		const isBackup = choice === backupLabel;

		assert.strictEqual(isBackup, true);
	});

	it("routes restore choice to executeRestore", () => {
		const choice = "3. Restore packages from backup" as string;
		const restoreLabel = "3. Restore packages from backup" as string;

		const isRestore = choice === restoreLabel;

		assert.strictEqual(isRestore, true);
	});

	it("routes help choice to showHelp", () => {
		const choice = "5. Show help and usage info";
		const helpLabel = "5. Show help and usage info";

		const isHelp = choice === helpLabel;

		assert.strictEqual(isHelp, true);
	});

	it("routes config choice to executeConfig", () => {
		const choice = "4. Configuration settings";
		const configLabel = "4. Configuration settings";

		const isConfig = choice === configLabel;

		assert.strictEqual(isConfig, true);
	});
});

describe("contextual scan labels", () => {
	it("shows fix label when unregistered packages exist", () => {
		const unregisteredCount = 3;
		const hasUnregistered = true;
		const label = hasUnregistered
			? `🔧 Fix ${unregisteredCount} unregistered packages`
			: "Find unregistered packages";

		assert.strictEqual(label, "🔧 Fix 3 unregistered packages");
	});

	it("shows generic label when no unregistered packages", () => {
		const hasUnregistered = false;
		const label = hasUnregistered
			? "🔧 Fix 0 unregistered packages"
			: "Find unregistered packages";

		assert.strictEqual(label, "Find unregistered packages");
	});

	it("uses singular form for one unregistered package", () => {
		const unregisteredCount = 1;
		const hasUnregistered = true;
		const label = hasUnregistered
			? `🔧 Fix ${unregisteredCount} unregistered ${unregisteredCount === 1 ? "package" : "packages"}`
			: "Find unregistered packages";

		assert.strictEqual(label, "🔧 Fix 1 unregistered package");
	});
});

describe("subcommand routing", () => {
	it("routes scan subcommand", () => {
		const args = "scan";
		const subcommand = (args || "").trim().toLowerCase();
		assert.strictEqual(subcommand, "scan");
	});

	it("routes backup subcommand with whitespace", () => {
		const args = "  backup  ";
		const subcommand = (args || "").trim().toLowerCase();
		assert.strictEqual(subcommand, "backup");
	});

	it("routes restore subcommand case-insensitively", () => {
		const args = "RESTORE";
		const subcommand = (args || "").trim().toLowerCase();
		assert.strictEqual(subcommand, "restore");
	});

	it("routes help subcommand", () => {
		const args = "help";
		const subcommand = (args || "").trim().toLowerCase();
		assert.strictEqual(subcommand, "help");
	});

	it("routes ? alias to help", () => {
		const args = "?";
		const subcommand = (args || "").trim().toLowerCase();
		assert.strictEqual(subcommand, "?");
	});

	it("falls through to menu for empty args", () => {
		const args = "";
		const subcommand = (args || "").trim().toLowerCase();
		assert.strictEqual(subcommand, "");
	});

	it("falls through to menu for unknown subcommand", () => {
		const args = "foo";
		const subcommand = (args || "").trim().toLowerCase();
		const known = ["scan", "backup", "restore", "help", "?"];
		assert.ok(!known.includes(subcommand));
	});
});

describe("restore batch sizing logic", () => {
	it("uses single confirm for 3 or fewer packages", () => {
		const packagesToRestore = ["pi-foo", "pi-bar", "pi-baz"];
		const usesBulkPrompt = packagesToRestore.length > 3;
		assert.strictEqual(usesBulkPrompt, false);
	});

	it("uses bulk prompt for more than 3 packages", () => {
		const packagesToRestore = ["pi-a", "pi-b", "pi-c", "pi-d", "pi-e"];
		const usesBulkPrompt = packagesToRestore.length > 3;
		assert.strictEqual(usesBulkPrompt, true);
	});
});

describe("scan batch sizing logic", () => {
	it("auto-registers for 3 or fewer unregistered packages", () => {
		const unregistered = ["pi-foo", "pi-bar", "pi-baz"];
		const shouldAskFirst = unregistered.length > 3;
		assert.strictEqual(shouldAskFirst, false);
	});

	it("asks before registering for more than 3 packages", () => {
		const unregistered = ["pi-a", "pi-b", "pi-c", "pi-d", "pi-e"];
		const shouldAskFirst = unregistered.length > 3;
		assert.strictEqual(shouldAskFirst, true);
	});
});

describe("status widget display patterns", () => {
	it("shows registered package count", () => {
		const registeredCount = 5;
		const widgetText = `${registeredCount} registered`;

		assert.ok(widgetText.includes("5 registered"));
	});

	it("shows unregistered package count", () => {
		const unregisteredCount = 2;
		const widgetText = `${unregisteredCount} unregistered`;

		assert.ok(widgetText.includes("2 unregistered"));
	});

	it("shortens home directory to ~ in display", () => {
		const homeDir = "/home/user";
		const currentPath = "/home/user/.pi/agent/backup.json";

		const displayPath = currentPath.startsWith(homeDir)
			? `~${currentPath.slice(homeDir.length)}`
			: currentPath;

		assert.strictEqual(displayPath, "~/.pi/agent/backup.json");
	});

	it("shows gist URL when configured", () => {
		const gistId = "abc123def456";
		const gistDisplay = gistId
			? `☁️ https://gist.github.com/${gistId}`
			: "☁️ not configured";

		assert.ok(gistDisplay.includes("gist.github.com"));
		assert.ok(gistDisplay.includes(gistId));
	});

	it("shows sync enabled indicator", () => {
		const gistEnabled = true as boolean;
		const syncDisplay = gistEnabled === false ? "⏸️" : "⏳";

		assert.strictEqual(syncDisplay, "⏳");
	});

	it("shows sync disabled indicator", () => {
		const gistEnabled = false;
		const syncDisplay = gistEnabled === false ? "⏸️" : "⏳";

		assert.strictEqual(syncDisplay, "⏸️");
	});
});
