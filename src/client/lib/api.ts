const BASE = "";

export type StylingApproach = "tailwind" | "css-modules" | "styled-components";

export interface ProjectConfig {
  rootPath: string;
  projectName: string;
  stylingApproach: StylingApproach[];
  testRunner: "jest" | "vitest" | "none";
  hasStorybook: boolean;
  hasExistingUiFolder: boolean;
  packageManager: "npm" | "pnpm" | "yarn";
  react: boolean;
}

export interface PropInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  variants: string[];
  props: PropInfo[];
  colorValues: string[];
  spacingValues: string[];
  hasTests: boolean;
  hasStory: boolean;
  a11yScore: number | null;
  testCoverage: number | null;
}

export interface DesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
}

export interface Inconsistency {
  type: "color" | "spacing" | "typography";
  message: string;
  values: string[];
  suggestedToken: string;
}

export interface ScanResult {
  components: ComponentInfo[];
  tokens: DesignTokens;
  inconsistencies: Inconsistency[];
  stylingApproach: StylingApproach[];
}

export async function fetchConfig(): Promise<ProjectConfig | null> {
  const res = await fetch(`${BASE}/api/config`);
  return res.json();
}

export async function fetchScan(): Promise<(ScanResult & { scanning: boolean }) | null> {
  const res = await fetch(`${BASE}/api/scan`);
  return res.json();
}

export async function requestReplace(
  componentName: string,
  files: string[]
): Promise<void> {
  await fetch(`${BASE}/api/replace-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ componentName, files }),
  });
}
