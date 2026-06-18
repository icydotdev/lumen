import fs from "fs";
import path from "path";
import fg from "fast-glob";
import type {
  ProjectConfig,
  StylingApproach,
  TestRunner,
  PackageManager,
} from "../types.js";

const IGNORE_DIRS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
  "**/coverage/**",
];

function readJson(file: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function readRootPackage(rootDir: string): Record<string, any> | null {
  return readJson(path.join(rootDir, "package.json"));
}

// Merge dependencies across the root and every nested package.json so monorepos
// and multi-app repos (api/ web/ client/ …) are detected correctly.
async function aggregateDeps(rootDir: string): Promise<Record<string, string>> {
  const deps: Record<string, string> = {};
  const pkgFiles = await fg(["package.json", "**/package.json"], {
    cwd: rootDir,
    ignore: IGNORE_DIRS,
    absolute: true,
    suppressErrors: true,
    deep: 6,
  });
  for (const file of pkgFiles) {
    const pkg = readJson(file);
    if (!pkg) continue;
    Object.assign(deps, pkg.dependencies || {}, pkg.devDependencies || {});
  }
  return deps;
}

export function detectPackageManager(rootDir: string): PackageManager {
  if (fs.existsSync(path.join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(rootDir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(rootDir, "package-lock.json"))) return "npm";

  const pkg = readRootPackage(rootDir);
  if (pkg && typeof pkg.packageManager === "string") {
    if (pkg.packageManager.startsWith("pnpm")) return "pnpm";
    if (pkg.packageManager.startsWith("yarn")) return "yarn";
  }
  return "npm";
}

async function detectTailwind(rootDir: string): Promise<boolean> {
  const matches = await fg(["**/tailwind.config.{js,ts,cjs,mjs}"], {
    cwd: rootDir,
    ignore: IGNORE_DIRS,
    onlyFiles: true,
    suppressErrors: true,
    deep: 6,
  });
  return matches.length > 0;
}

async function detectCssModules(rootDir: string): Promise<boolean> {
  const matches = await fg(["**/*.module.css", "**/*.module.scss"], {
    cwd: rootDir,
    ignore: IGNORE_DIRS,
    onlyFiles: true,
    suppressErrors: true,
    deep: 8,
  });
  return matches.length > 0;
}

function detectTestRunner(deps: Record<string, string>): TestRunner {
  if ("vitest" in deps) return "vitest";
  if ("jest" in deps) return "jest";
  return "none";
}

async function detectStorybook(
  rootDir: string,
  deps: Record<string, string>
): Promise<boolean> {
  if (Object.keys(deps).some((d) => d.startsWith("@storybook/"))) return true;
  const matches = await fg(["**/.storybook"], {
    cwd: rootDir,
    ignore: IGNORE_DIRS,
    onlyDirectories: true,
    suppressErrors: true,
    deep: 6,
  });
  return matches.length > 0;
}

export async function detectProject(rootDir: string): Promise<ProjectConfig> {
  const rootPkg = readRootPackage(rootDir);
  const deps = await aggregateDeps(rootDir);

  const stylingApproach: StylingApproach[] = [];
  if (await detectTailwind(rootDir)) stylingApproach.push("tailwind");
  if (await detectCssModules(rootDir)) stylingApproach.push("css-modules");
  if ("styled-components" in deps) stylingApproach.push("styled-components");

  // Next.js implies React.
  const react = "react" in deps || "next" in deps;

  return {
    rootPath: rootDir,
    projectName: rootPkg?.name || path.basename(rootDir),
    stylingApproach,
    testRunner: detectTestRunner(deps),
    hasStorybook: await detectStorybook(rootDir, deps),
    hasExistingUiFolder: fs.existsSync(path.join(rootDir, "ui")),
    packageManager: detectPackageManager(rootDir),
    react,
  };
}
