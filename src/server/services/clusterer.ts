import type { DesignTokens, Inconsistency } from "../types.js";

interface RawValues {
  colors: string[];
  spacing: string[];
  typography: string[];
  radius: string[];
  shadows: string[];
}

interface ClusterOutput {
  tokens: DesignTokens;
  inconsistencies: Inconsistency[];
}

// ── Colour helpers ───────────────────────────────────────
interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function parseColorToHsl(value: string): Hsl | null {
  if (value.startsWith("#")) {
    const rgb = hexToRgb(value);
    return rgb ? rgbToHsl(...rgb) : null;
  }
  const rgbMatch = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgbMatch) {
    return rgbToHsl(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
  }
  const hslMatch = value.match(/hsla?\(\s*(\d+)[,\s]+(\d+)%?[,\s]+(\d+)%?/);
  if (hslMatch) {
    return { h: +hslMatch[1], s: +hslMatch[2], l: +hslMatch[3] };
  }
  return null;
}

// Normalised distance between two HSL colours (0–1)
function hslDistance(a: Hsl, b: Hsl): number {
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 360;
  const ds = Math.abs(a.s - b.s) / 100;
  const dl = Math.abs(a.l - b.l) / 100;
  return Math.sqrt(dh * dh + ds * ds + dl * dl);
}

function nameColorByHsl(hsl: Hsl, index: number): string {
  if (hsl.s < 12) {
    if (hsl.l > 92) return "background";
    if (hsl.l > 70) return "muted";
    if (hsl.l < 18) return "foreground";
    return `neutral-${index}`;
  }
  const hue = hsl.h;
  let family = "primary";
  if (hue < 20 || hue >= 340) family = "red";
  else if (hue < 45) family = "orange";
  else if (hue < 70) family = "yellow";
  else if (hue < 165) family = "green";
  else if (hue < 200) family = "teal";
  else if (hue < 255) family = "blue";
  else if (hue < 290) family = "violet";
  else family = "pink";
  return index === 0 ? family : `${family}-${index}`;
}

// ── Frequency counting ───────────────────────────────────
function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

function clusterColors(
  values: string[]
): { tokens: Record<string, string>; inconsistencies: Inconsistency[] } {
  const tokens: Record<string, string> = {};
  const inconsistencies: Inconsistency[] = [];

  // Tailwind colour classes — keep as-is, named by family + shade
  const twClasses = values.filter((v) => !v.startsWith("#") && !/^(rgb|hsl)/.test(v));
  const literalColors = values.filter(
    (v) => v.startsWith("#") || /^(rgb|hsl)/.test(v)
  );

  // Cluster literal colours by HSL proximity
  interface Cluster {
    hsl: Hsl;
    members: string[];
  }
  const clusters: Cluster[] = [];
  const counts = countBy(literalColors);
  const uniqueLiterals = [...counts.keys()];

  for (const value of uniqueLiterals) {
    const hsl = parseColorToHsl(value);
    if (!hsl) continue;
    let placed = false;
    for (const cluster of clusters) {
      if (hslDistance(cluster.hsl, hsl) < 0.05) {
        cluster.members.push(value);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ hsl, members: [value] });
  }

  clusters.sort((a, b) => {
    const ca = a.members.reduce((s, m) => s + (counts.get(m) ?? 0), 0);
    const cb = b.members.reduce((s, m) => s + (counts.get(m) ?? 0), 0);
    return cb - ca;
  });

  clusters.forEach((cluster, i) => {
    // Representative = most frequent member
    const rep = cluster.members.sort(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    )[0];
    const name = nameColorByHsl(cluster.hsl, i);
    tokens[name] = rep;

    if (cluster.members.length > 1) {
      inconsistencies.push({
        type: "color",
        message: `${cluster.members.length} near-duplicate colours found, unified as "${name}"`,
        values: cluster.members,
        suggestedToken: name,
      });
    }
  });

  // Tailwind classes — group by family-shade base value
  const twCounts = countBy(twClasses);
  for (const [cls, _count] of [...twCounts.entries()].sort((a, b) => b[1] - a[1])) {
    // bg-blue-500 → blue-500
    const value = cls.replace(/^[a-z]+-/, "");
    const key = value.replace("/", "-");
    if (!(key in tokens)) tokens[key] = value;
  }

  return { tokens, inconsistencies };
}

function clusterSpacing(
  values: string[]
): { tokens: Record<string, string>; inconsistencies: Inconsistency[] } {
  const tokens: Record<string, string> = {};
  const counts = countBy(values);
  // Extract numeric scale from tailwind classes (p-4 → 4)
  const scale = new Set<string>();
  for (const v of counts.keys()) {
    const m = v.match(/-(\d{1,3}(?:\.\d)?|px)$/);
    if (m) scale.add(m[1]);
  }
  const sorted = [...scale].sort((a, b) => {
    if (a === "px") return -1;
    if (b === "px") return 1;
    return parseFloat(a) - parseFloat(b);
  });
  for (const s of sorted) {
    tokens[`space-${s}`] = s === "px" ? "1px" : `${parseFloat(s) * 0.25}rem`;
  }
  return { tokens, inconsistencies: [] };
}

function clusterTypography(
  values: string[]
): Record<string, string> {
  const tokens: Record<string, string> = {};
  const sizeMap: Record<string, string> = {
    "text-xs": "0.75rem",
    "text-sm": "0.875rem",
    "text-base": "1rem",
    "text-lg": "1.125rem",
    "text-xl": "1.25rem",
    "text-2xl": "1.5rem",
    "text-3xl": "1.875rem",
    "text-4xl": "2.25rem",
    "text-5xl": "3rem",
    "text-6xl": "3.75rem",
  };
  const weightMap: Record<string, string> = {
    "font-thin": "100",
    "font-extralight": "200",
    "font-light": "300",
    "font-normal": "400",
    "font-medium": "500",
    "font-semibold": "600",
    "font-bold": "700",
    "font-extrabold": "800",
    "font-black": "900",
  };
  for (const v of new Set(values)) {
    if (v in sizeMap) tokens[v.replace("text-", "size-")] = sizeMap[v];
    if (v in weightMap) tokens[v.replace("font-", "weight-")] = weightMap[v];
  }
  return tokens;
}

function clusterRadius(values: string[]): Record<string, string> {
  const map: Record<string, string> = {
    rounded: "0.25rem",
    "rounded-none": "0",
    "rounded-sm": "0.125rem",
    "rounded-md": "0.375rem",
    "rounded-lg": "0.5rem",
    "rounded-xl": "0.75rem",
    "rounded-2xl": "1rem",
    "rounded-3xl": "1.5rem",
    "rounded-full": "9999px",
  };
  const tokens: Record<string, string> = {};
  for (const v of new Set(values)) {
    if (v in map) tokens[v.replace("rounded", "radius").replace(/^radius$/, "radius-base")] = map[v];
  }
  return tokens;
}

function clusterShadows(values: string[]): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const v of new Set(values)) {
    tokens[v.replace("shadow", "shadow").replace(/^shadow$/, "shadow-base")] = v;
  }
  return tokens;
}

export function clusterTokens(raw: RawValues): ClusterOutput {
  const colorResult = clusterColors(raw.colors);
  const spacingResult = clusterSpacing(raw.spacing);

  const tokens: DesignTokens = {
    colors: colorResult.tokens,
    spacing: spacingResult.tokens,
    typography: clusterTypography(raw.typography),
    borderRadius: clusterRadius(raw.radius),
    shadows: clusterShadows(raw.shadows),
  };

  const inconsistencies: Inconsistency[] = [
    ...colorResult.inconsistencies,
    ...spacingResult.inconsistencies,
  ];

  return { tokens, inconsistencies };
}
