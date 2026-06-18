import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import type { ProjectConfig } from "./types.js";
import { state, setScanResult } from "./services/state.js";
import { createConfigRouter } from "./routes/config.js";
import { createScanRouter } from "./routes/scan.js";
import { createComponentsRouter } from "./routes/components.js";
import { createIngestRouter } from "./routes/ingest.js";
import { setupWebSocket } from "./ws/progress-stream.js";
import { startWatcher } from "./services/watcher.js";
import { scanProject } from "./services/scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type ServerMode = "ai" | "dashboard";

interface StartOptions {
  config: ProjectConfig;
  port: number;
  mode: ServerMode;
}

// Runs the dashboard server in the foreground (the detached child process,
// or `npm run lumen` for ongoing dashboard mode).
export async function startServer({ config, port, mode }: StartOptions) {
  state.config = config;
  state.scanResult.stylingApproach = config.stylingApproach;

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.use(createConfigRouter());
  app.use(createScanRouter());
  app.use(createComponentsRouter());
  app.use(createIngestRouter());

  const clientDir = path.join(__dirname, "..", "client");
  app.use(express.static(clientDir));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });

  const server = createServer(app);
  setupWebSocket(server);

  // Dashboard mode: scan current ui/ + src now, then watch for changes.
  if (mode === "dashboard") {
    const result = await scanProject(config.rootPath, config.stylingApproach);
    setScanResult(result);
    startWatcher(config, (r) => setScanResult(r));
  } else {
    // AI mode: wait for Claude to push progress.
    state.scanning = true;
  }

  await new Promise<void>((resolve) => server.listen(port, resolve));

  const cleanup = () => {
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return { server, port };
}
