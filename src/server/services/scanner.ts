import fs from "fs";
import path from "path";
import fg from "fast-glob";
import type {
  ComponentInfo,
  PropInfo,
  ScanResult,
  StylingApproach,
} from "../types.js";
import { clusterTokens } from "./clusterer.js";

const IGNORE_DIRS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
  "**/coverage/**",
  "**/ui/**", // don't re-scan our own generated output
];

const SOURCE_GLOBS = ["**/*.tsx", "**/*.jsx"];

// ── Regexes ──────────────────────────────────────────────
const HEX_COLOR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_COLOR = /rgba?\([^)]*\)/g;
const HSL_COLOR = /hsla?\([^)]*\)/g;
const CLASSNAME_ATTR = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
// Tailwind colour utilities, e.g. bg-blue-500, text-red-600/50
const TW_COLOR_CLASS =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|shadow)-(?:[a-z]+)-(?:\d{1,3})(?:\/\d{1,3})?\b/g;
// Tailwind spacing utilities, e.g. p-4, mt-8, gap-2, space-x-3
const TW_SPACING_CLASS =
  /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|inset|top|bottom|left|right)-(?:\d{1,3}(?:\.\d)?|px)\b/g;
// Tailwind typography utilities
const TW_TEXT_SIZE = /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g;
const TW_FONT_WEIGHT =
  /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g;
const TW_RADIUS = /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?\b/g;
const TW_SHADOW = /\bshadow(?:-(?:sm|md|lg|xl|2xl|inner|none))?\b/g;

function extractAllClasses(content: string): string[] {
  const classes: string[] = [];
  let m: RegExpExecArray | null;
  CLASSNAME_ATTR.lastIndex = 0;
  while ((m = CLASSNAME_ATTR.exec(content)) !== null) {
    const value = m[1] ?? m[2] ?? m[3] ?? "";
    for (const c of value.split(/\s+/)) {
      if (c) classes.push(c);
    }
  }
  return classes;
}

function matchAll(content: string, re: RegExp): string[] {
  return content.match(re) ?? [];
}

function extractComponentName(content: string, filePath: string): string | null {
  // export default function Foo / export function Foo / export const Foo =
  const patterns = [
    /export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
    /export\s+function\s+([A-Z][A-Za-z0-9_]*)/,
    /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*[:=]/,
    /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/,
    /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z]+)\s*=>/,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) return m[1];
  }
  // Fall back to filename if it looks like a component
  const base = path.basename(filePath).replace(/\.(tsx|jsx)$/, "");
  if (/^[A-Z]/.test(base)) return base;
  return null;
}

function extractProps(content: string, componentName: string): PropInfo[] {
  // Look for `interface FooProps extends X {...}` or `type FooProps = {...}`
  const ifaceRe = new RegExp(
    `(?:interface|type)\\s+${componentName}Props\\b[^{]*\\{([\\s\\S]*?)\\n\\}`
  );
  const m = content.match(ifaceRe);
  if (!m) return [];

  const body = m[1];
  const props: PropInfo[] = [];
  const lineRe = /^\s*([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([^;\n]+);?/gm;
  let lm: RegExpExecArray | null;
  while ((lm = lineRe.exec(body)) !== null) {
    props.push({
      name: lm[1],
      optional: lm[2] === "?",
      type: lm[3].trim(),
    });
  }
  return props;
}

function extractVariants(content: string, props: PropInfo[]): string[] {
  const variants = new Set<string>();

  // From a `variant` prop union type: variant?: "primary" | "ghost"
  const variantProp = props.find((p) => /variant|kind|type|intent/i.test(p.name));
  if (variantProp) {
    const literals = variantProp.type.match(/"([^"]+)"|'([^']+)'/g);
    if (literals) {
      for (const lit of literals) variants.add(lit.replace(/['"]/g, ""));
    }
  }

  // From a variants map: { primary: "...", ghost: "..." }
  const variantsObj = content.match(
    /(?:variants|variantStyles|styles)\s*[:=]\s*\{([\s\S]*?)\}/
  );
  if (variantsObj) {
    // Match keys anywhere (inline or multi-line): `name:` preceded by { or ,
    const keys = variantsObj[1].match(/(?:^|[{,])\s*([a-zA-Z][a-zA-Z0-9]*)\s*:/g);
    if (keys) {
      for (const k of keys) variants.add(k.replace(/[{,:\s]/g, ""));
    }
  }

  return [...variants];
}

function hasSibling(filePath: string, ...suffixes: string[]): boolean {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath).replace(/\.(tsx|jsx)$/, "");
  for (const suffix of suffixes) {
    for (const ext of [".tsx", ".jsx", ".ts", ".js"]) {
      if (fs.existsSync(path.join(dir, `${base}${suffix}${ext}`))) return true;
    }
  }
  return false;
}

export async function scanProject(
  rootDir: string,
  stylingApproach: StylingApproach[]
): Promise<ScanResult> {
  const files = await fg(SOURCE_GLOBS, {
    cwd: rootDir,
    ignore: IGNORE_DIRS,
    absolute: true,
    onlyFiles: true,
    suppressErrors: true,
  });

  const components: ComponentInfo[] = [];
  const allColors: string[] = [];
  const allSpacing: string[] = [];
  const allTypography: string[] = [];
  const allRadius: string[] = [];
  const allShadows: string[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    // Heuristic: must contain JSX to be a component file
    if (!/return\s*[(<]/.test(content) && !/=>\s*[(<]/.test(content)) continue;

    const name = extractComponentName(content, file);
    if (!name) continue;

    const classes = extractAllClasses(content);
    const classBlob = classes.join(" ");

    const colorValues = [
      ...matchAll(content, HEX_COLOR),
      ...matchAll(content, RGB_COLOR),
      ...matchAll(content, HSL_COLOR),
      ...matchAll(classBlob, TW_COLOR_CLASS),
    ];
    const spacingValues = matchAll(classBlob, TW_SPACING_CLASS);

    allColors.push(...colorValues);
    allSpacing.push(...spacingValues);
    allTypography.push(
      ...matchAll(classBlob, TW_TEXT_SIZE),
      ...matchAll(classBlob, TW_FONT_WEIGHT)
    );
    allRadius.push(...matchAll(classBlob, TW_RADIUS));
    allShadows.push(...matchAll(classBlob, TW_SHADOW));

    const props = extractProps(content, name);

    components.push({
      name,
      filePath: path.relative(rootDir, file),
      variants: extractVariants(content, props),
      props,
      colorValues: [...new Set(colorValues)],
      spacingValues: [...new Set(spacingValues)],
      hasTests: hasSibling(file, ".test", ".spec"),
      hasStory: hasSibling(file, ".stories"),
      a11yScore: null,
      testCoverage: null,
    });
  }

  // De-duplicate components by name (keep the one with most props/variants)
  const byName = new Map<string, ComponentInfo>();
  for (const c of components) {
    const existing = byName.get(c.name);
    if (
      !existing ||
      c.props.length + c.variants.length >
        existing.props.length + existing.variants.length
    ) {
      byName.set(c.name, c);
    }
  }
  const uniqueComponents = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const { tokens, inconsistencies } = clusterTokens({
    colors: allColors,
    spacing: allSpacing,
    typography: allTypography,
    radius: allRadius,
    shadows: allShadows,
  });

  return {
    components: uniqueComponents,
    tokens,
    inconsistencies,
    stylingApproach,
  };
}
