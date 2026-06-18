#!/usr/bin/env node

import path from "path";
import fs from "fs";
import open from "open";
import { startServer } from "./server/index.js";
import { detectProject } from "./server/services/detector.js";
import { runScaffold } from "./server/services/orchestrator.js";
import { findAvailablePort } from "./server/util/port.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  Usage: lumen [options]

  Lumen is the engine behind the "extract-design-system" skill. The skill runs
  it; you rarely call it by hand. See https://github.com/icydotdev/lumen

  Options:
    --serve           Run the dashboard + ingest API; wait for the AI to drive it
                      (default when no mode is given)
    --dashboard       Open the dashboard for an already-scaffolded project (watch ui/)
    --fallback        Scan & scaffold deterministically, without an AI (TODO stubs)
    --no-browser      Don't open the browser automatically
    --port <number>   Port to run on (default: 3719)
    --dry-run         (with --fallback) Show what would be generated, write nothing
    -h, --help        Show this help message
`);
  process.exit(0);
}

const portIndex = args.indexOf("--port");
const preferredPort =
  portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3719;
const noBrowser = args.includes("--no-browser");
const dashboard = args.includes("--dashboard");
const fallback = args.includes("--fallback");
const dryRun = args.includes("--dry-run");
const targetDir = process.env.TARGET_DIR || process.cwd();

main();

async function main() {
  if (!fs.existsSync(path.join(targetDir, "package.json"))) {
    console.error(
      `\n  Error: No package.json found in ${targetDir}\n  Run this from a project directory.\n`
    );
    process.exit(1);
  }

  const config = await detectProject(targetDir);
  if (!config.react) {
    console.error(
      `\n  Error: React was not found in this project's dependencies.\n`
    );
    process.exit(1);
  }

  const port = await findAvailablePort(preferredPort);
  const mode = dashboard ? "dashboard" : "ai";
  await startServer({ config, port, mode });
  if (!noBrowser) open(`http://localhost:${port}`);

  // Banner — the driving AI reads the base URL from here.
  console.log(`\n  ✨ Lumen ready  ·  http://localhost:${port}`);
  console.log(`  Target: ${config.rootPath}`);
  console.log(`  Styling: ${config.stylingApproach.join(", ") || "none detected"}\n`);

  if (dashboard) {
    console.log(`  Dashboard mode — watching ui/ and src/.\n`);
    return;
  }

  if (fallback) {
    const scan = await runScaffold({ config, dryRun });
    console.log(`  Components: ${scan.components.length}  ·  Issues: ${scan.inconsistencies.length}`);
    console.log(dryRun ? `  (dry run — nothing written)\n` : `  ✅ Scaffolded ui/\n`);
    return;
  }

  // AI serve mode: hold the server open; the AI POSTs progress while it works.
  console.log(`  Waiting for the AI to scan & scaffold. POST progress to /api/*.\n`);
}
