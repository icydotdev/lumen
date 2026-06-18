import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { progressBus } from "./progress-bus.js";
import type { PackageManager } from "../types.js";

type Status = "stopped" | "starting" | "running" | "error";
type TestStatus = "idle" | "running" | "passed" | "failed";

export const storybookState = {
  status: "stopped" as Status,
  url: null as string | null,
};
export const testState = {
  status: "idle" as TestStatus,
  lastExitCode: null as number | null,
};

let storybookProc: ChildProcess | null = null;
let testProc: ChildProcess | null = null;

function log(data: string, stream: "stdout" | "stderr" = "stdout") {
  progressBus.emitProgress({ type: "log", stream, data });
}

function readScripts(cwd: string): Record<string, string> {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

function runScriptCmd(pm: PackageManager, script: string): [string, string[]] {
  if (pm === "yarn") return ["yarn", [script]];
  return [pm, ["run", script]];
}

function streamLines(proc: ChildProcess) {
  const pipe = (buf: Buffer, stream: "stdout" | "stderr") => {
    for (const line of buf.toString().split("\n")) {
      if (line.trim()) log(line, stream);
    }
  };
  proc.stdout?.on("data", (b) => pipe(b, "stdout"));
  proc.stderr?.on("data", (b) => pipe(b, "stderr"));
}

// ── Storybook ────────────────────────────────────────────
export function startStorybook(cwd: string, pm: PackageManager) {
  if (storybookProc) return storybookState;

  const scripts = readScripts(cwd);
  if (!scripts.storybook) {
    log("✗ No \"storybook\" script found. Ask Claude to set up Storybook first.", "stderr");
    storybookState.status = "error";
    return storybookState;
  }

  storybookState.status = "starting";
  storybookState.url = null;
  log("▸ Starting Storybook…");

  const [cmd, args] = runScriptCmd(pm, "storybook");
  const proc = spawn(cmd, args, { cwd });
  storybookProc = proc;

  const scan = (buf: Buffer, stream: "stdout" | "stderr") => {
    const text = buf.toString();
    for (const line of text.split("\n")) if (line.trim()) log(line, stream);
    const m = text.match(/(?:Local|local):\s*(https?:\/\/[^\s]+)/);
    if (m && storybookState.status !== "running") {
      storybookState.url = m[1].replace(/[.,]$/, "");
      storybookState.status = "running";
      log(`✓ Storybook ready at ${storybookState.url}`);
    }
  };
  proc.stdout?.on("data", (b) => scan(b, "stdout"));
  proc.stderr?.on("data", (b) => scan(b, "stderr"));
  proc.on("exit", (code) => {
    storybookState.status = code === 0 ? "stopped" : "error";
    storybookState.url = null;
    storybookProc = null;
    log(`Storybook stopped (exit ${code}).`);
  });

  return storybookState;
}

// ── Tests ────────────────────────────────────────────────
export function runTests(
  cwd: string,
  pm: PackageManager,
  runner: "jest" | "vitest" | "none",
  filter?: string
) {
  if (testProc) return testState;

  const scripts = readScripts(cwd);
  let cmd: string;
  let args: string[];

  if (scripts.test && !filter) {
    [cmd, args] = runScriptCmd(pm, "test");
  } else if (runner === "vitest") {
    cmd = "npx";
    args = ["vitest", "run", ...(filter ? [filter] : [])];
  } else if (runner === "jest") {
    cmd = "npx";
    args = ["jest", ...(filter ? [filter] : [])];
  } else {
    log("✗ No test runner detected. Ask Claude to add vitest or jest.", "stderr");
    testState.status = "failed";
    return testState;
  }

  testState.status = "running";
  log(`▸ Running tests${filter ? ` for ${filter}` : ""}…`);

  const proc = spawn(cmd, args, { cwd });
  testProc = proc;
  streamLines(proc);
  proc.on("exit", (code) => {
    testState.status = code === 0 ? "passed" : "failed";
    testState.lastExitCode = code;
    testProc = null;
    log(code === 0 ? "✓ Tests passed." : `✗ Tests failed (exit ${code}).`, code === 0 ? "stdout" : "stderr");
  });

  return testState;
}

export function killProcesses() {
  storybookProc?.kill();
  testProc?.kill();
}
