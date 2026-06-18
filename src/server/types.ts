export type StylingApproach = "tailwind" | "css-modules" | "styled-components";
export type TestRunner = "jest" | "vitest" | "none";
export type PackageManager = "npm" | "pnpm" | "yarn";

export interface ProjectConfig {
  rootPath: string;
  projectName: string;
  stylingApproach: StylingApproach[];
  testRunner: TestRunner;
  hasStorybook: boolean;
  hasExistingUiFolder: boolean;
  packageManager: PackageManager;
  react: boolean;
}

export interface PropInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface ComponentInfo {
  name: string;
  filePath: string; // Relative path
  variants: string[]; // Inferred variant names e.g. ['primary', 'ghost']
  props: PropInfo[];
  colorValues: string[]; // Raw colour values used (hex, rgb, Tailwind class)
  spacingValues: string[]; // Raw spacing values used
  hasTests: boolean;
  hasStory: boolean;
  a11yScore: number | null; // null until tests run
  testCoverage: number | null;
}

export interface DesignTokens {
  colors: Record<string, string>; // inferred name → value
  spacing: Record<string, string>;
  typography: Record<string, string>; // fontSize, fontWeight, lineHeight
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

export interface ScanSummary {
  componentCount: number;
  tokenCount: number;
  inconsistencyCount: number;
}

export type TokenKind = keyof DesignTokens;

export type ProgressMessage =
  | { type: "scan_start" }
  | { type: "component"; component: ComponentInfo }
  | { type: "token"; kind: TokenKind; name: string; value: string }
  | { type: "inconsistency"; inconsistency: Inconsistency }
  | { type: "generating"; name: string }
  | { type: "generated"; name: string }
  | { type: "complete"; summary: ScanSummary }
  | { type: "log"; stream: "stdout" | "stderr"; data: string };
