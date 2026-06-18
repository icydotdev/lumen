import type { ProjectConfig } from "../types.js";
import { scanProject } from "./scanner.js";
import { generate, injectScript } from "./generator.js";
import { progressBus } from "./progress-bus.js";
import { state } from "./state.js";

interface ScaffoldOptions {
  config: ProjectConfig;
  dryRun: boolean;
}

// Full scan → generate → inject flow, streaming progress over the bus.
export async function runScaffold({ config, dryRun }: ScaffoldOptions) {
  const scan = await scanProject(config.rootPath, config.stylingApproach);
  state.config = config;
  state.scanResult = scan;

  await generate({ config, scan, emit: (m) => progressBus.emitProgress(m), dryRun });

  if (!dryRun) {
    injectScript(config.rootPath, dryRun);
  }

  return scan;
}

// Dashboard mode: just re-scan, no generation.
export async function runScan(config: ProjectConfig) {
  const scan = await scanProject(config.rootPath, config.stylingApproach);
  state.config = config;
  state.scanResult = scan;
  return scan;
}
