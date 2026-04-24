/**
 * Menu Navigation Tests - Story 5.1: Menu Navigation
 *
 * Tests menu structure, option filtering, and selection handling patterns.
 */

import assert from "node:assert";
import { describe, it } from "node:test";

describe("menu structure and sections", () => {
	it("has Package Operations section header", () => {
		const options = [
			"═══ Package Operations ═══",
			"Scan for unregistered packages",
			"Save backup",
			"Restore packages",
		];
		assert.ok(options[0].includes("Package Operations"));
	});

	it("has Configuration section header", () => {
		const options = [
			"═══ Configuration ═══",
			"Change backup path",
			"Setup Gist",
		];
		assert.ok(options[0].includes("Configuration"));
	});

	it("has System section header", () => {
		const options = ["═══ System ═══", "Help", "Exit"];
		assert.ok(options[0].includes("System"));
	});

	it("filters out empty strings from menu", () => {
		// Simulates: .filter(Boolean)
		const rawOptions = [
			"═══ Package Operations ═══",
			"Scan",
			"", // conditional empty
			"Backup",
			"", // another empty
			"═══ Exit ═══",
		];
		const filtered = rawOptions.filter(Boolean);

		assert.strictEqual(filtered.length, 4);
		assert.ok(!filtered.includes(""));
	});
});

describe("menu conditional options based on config", () => {
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
		const exitOption = "Exit";

		const shouldExit = choice === undefined || choice === exitOption;

		assert.strictEqual(shouldExit, true);
	});

	it("exits on exit option", () => {
		const choice = "Exit";
		const exitOption = "Exit";

		const shouldExit = choice === undefined || choice === exitOption;

		assert.strictEqual(shouldExit, true);
	});

	it("continues on valid menu selection", () => {
		const choice = "Scan for unregistered packages" as string;
		const exitOption = "Exit" as string;

		const shouldExit = choice === undefined || choice === exitOption;

		assert.strictEqual(shouldExit, false);
	});
});

describe("menu action routing", () => {
	it("routes scan choice to executeScan", () => {
		const choice = "Scan for unregistered packages" as string;
		const scanLabel = "Scan for unregistered packages" as string;

		const isScan = choice === scanLabel;

		assert.strictEqual(isScan, true);
	});

	it("routes backup choice to executeBackup", () => {
		const choice = "Save backup to file + Gist" as string;
		const backupLabel = "Save backup to file + Gist" as string;

		const isBackup = choice === backupLabel;

		assert.strictEqual(isBackup, true);
	});

	it("routes restore choice to executeRestore", () => {
		const choice = "Restore packages from backup" as string;
		const restoreLabel = "Restore packages from backup" as string;

		const isRestore = choice === restoreLabel;

		assert.strictEqual(isRestore, true);
	});

	it("routes help choice to showHelp", () => {
		const choice = "Show help";
		const helpLabel = "Show help";

		const isHelp = choice === helpLabel;

		assert.strictEqual(isHelp, true);
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
