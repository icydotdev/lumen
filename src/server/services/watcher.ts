import path from "path";
import chokidar from "chokidar";
import type { ProjectConfig, ScanResult } from "../types.js";
import { scanProject } from "./scanner.js";

type OnResult = (result: ScanResult) => void;

// Dashboard-mode watcher: re-scan src/ and ui/ on change, debounced.
export function startWatcher(config: ProjectConfig, onResult: OnResult) {
  const watchPaths = [
    path.join(config.rootPath, "src"),
    path.join(config.rootPath, "ui"),
  ];

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[/\\])(node_modules|\.git|dist|build|\.next|coverage)([/\\]|$)/,
    ignoreInitial: true,
    persistent: true,
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const rescan = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const result = await scanProject(config.rootPath, config.stylingApproach);
      onResult(result);
    }, 500);
  };

  watcher.on("add", rescan);
  watcher.on("change", rescan);
  watcher.on("unlink", rescan);

  return () => watcher.close();
}
