# @icydotdev/lumen — Product Specification

## Overview

`@icydotdev/lumen` is a CLI tool that scans a React codebase, infers the implicit design system from existing components, and scaffolds a structured `ui/` folder containing a theme file, organised components, Storybook stories, accessibility tests, and unit tests. A local dashboard (same pattern as `@icydotdev/runny`) provides ongoing health monitoring of the design system.

**Primary invocation (v1):**

```bash
claude -- npx @icydotdev/lumen
```

Claude Code acts as the AI brain — no separate API key required.

**Ongoing dashboard:**

```bash
npm run lumen
```

---

## Tech Stack

Mirrors `runny` and `nextmap` exactly:

| Layer       | Technology                                           |
| ----------- | ---------------------------------------------------- |
| Language    | TypeScript (ESM, `"type": "module"`)                 |
| CLI entry   | `src/cli.ts` → `dist/cli.js`                         |
| Server      | Express 5                                            |
| Client      | React 19 + Vite 6                                    |
| Styling     | Tailwind CSS 3                                       |
| State       | Zustand 5                                            |
| Icons       | lucide-react                                         |
| Build       | `tsc` (server) + `vite build` (client)               |
| Dev         | `concurrently` (server: `tsx watch`, client: `vite`) |
| Terminal UI | `@xterm/xterm` (same as runny)                       |
| Port        | 3719 (runny=3717, nextmap=3718, lumen=3719)          |

---

## Supported Styling Approaches (v1)

Detection is non-exclusive — a project may use multiple.

| Approach          | Detection Signal                                   |
| ----------------- | -------------------------------------------------- |
| Tailwind          | `tailwind.config.*` exists                         |
| CSS Modules       | `.module.css` or `.module.scss` files present      |
| Styled Components | `styled-components` in `package.json` dependencies |

> **v1 constraint:** Tailwind + React is the primary target and best-supported path. CSS Modules and Styled Components are detected and respected but may produce less polished output. Document this clearly in the README.

---

## Repository Structure

```
lumen/
├── src/
│   ├── cli.ts                        # CLI entry point
│   ├── server/
│   │   ├── index.ts                  # Express server setup
│   │   ├── types.ts                  # Shared types
│   │   ├── routes/
│   │   │   ├── scan.ts               # GET /api/scan — returns scan results
│   │   │   ├── components.ts         # GET /api/components — component list + metadata
│   │   │   └── config.ts             # GET /api/config — project config
│   │   ├── services/
│   │   │   ├── detector.ts           # Detect styling approach, framework, test runner
│   │   │   ├── scanner.ts            # Crawl codebase, extract components + tokens
│   │   │   ├── clusterer.ts          # Group similar values (colours, spacing, etc.)
│   │   │   ├── generator.ts          # Scaffold ui/ folder, theme, stories, tests
│   │   │   └── watcher.ts            # File watcher for dashboard re-scan
│   │   └── ws/
│   │       └── progress-stream.ts    # WebSocket for realtime scaffolding progress
│   └── client/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── vite-env.d.ts
│       ├── styles/globals.css
│       ├── public/favicon.svg
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── ComponentTable.tsx    # Main animated table of discovered components
│       │   ├── TokenPanel.tsx        # Inferred design tokens (colours, spacing, etc.)
│       │   ├── HealthBar.tsx         # Test coverage + a11y score per component
│       │   ├── TerminalPanel.tsx     # xterm.js terminal (same as runny)
│       │   ├── DiffModal.tsx         # Shows proposed codebase replacements before applying
│       │   └── StatusBadge.tsx
│       ├── hooks/
│       │   ├── useScan.ts
│       │   ├── useProgress.ts        # WebSocket hook for realtime updates
│       │   └── useTheme.ts
│       ├── store/
│       │   └── lumen.ts              # Zustand store
│       └── lib/
│           ├── api.ts
│           └── ws.ts
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## What Gets Generated in the User's Project

```
ui/
├── components/
│   └── Button/
│       ├── Button.tsx                # Cleaned, unified component
│       ├── Button.stories.tsx        # Storybook stories (all variants)
│       ├── Button.test.tsx           # Unit tests + a11y tests (axe-core)
│       └── index.ts                  # Re-export
├── theme.ts                          # All inferred design tokens
├── tokens.ts                         # Raw token values (colours, spacing, etc.)
└── lumen.config.ts                   # Lumen config (styling approach, options)
```

Injected into user's `package.json` scripts:

```json
"lumen": "npx @icydotdev/lumen --dashboard"
```

---

## CLI Behaviour (`src/cli.ts`)

```
Usage: lumen [options]

Options:
  --dashboard       Launch dashboard only (no scaffolding), for ongoing use
  --no-browser      Don't open browser automatically
  --port <number>   Port to run on (default: 3719)
  --dry-run         Show what would be generated without writing files
  -h, --help        Show help
```

**Standard flow (no flags):**

1. Validate React project exists (`package.json` + React in deps)
2. Run detector — identify styling approach, test runner, Storybook presence
3. Open browser to dashboard immediately
4. Begin scaffolding — stream progress via WebSocket to dashboard
5. When complete, inject `lumen` script into `package.json`
6. Print summary to stdout

**Dashboard flow (`--dashboard`):**

1. Re-scan existing `ui/` folder
2. Open browser to dashboard showing current health state
3. Stay running — watch for file changes and re-scan

---

## Server (`src/server/`)

### `detector.ts`

Detects project setup. Returns a `ProjectConfig` object:

```typescript
export interface ProjectConfig {
  rootPath: string;
  projectName: string;
  stylingApproach: ("tailwind" | "css-modules" | "styled-components")[];
  testRunner: "jest" | "vitest" | "none";
  hasStorybook: boolean;
  hasExistingUiFolder: boolean;
  packageManager: "npm" | "pnpm" | "yarn";
  react: boolean;
}
```

Detection logic:

- **Tailwind:** `tailwind.config.js` or `tailwind.config.ts` exists
- **CSS Modules:** any `.module.css` or `.module.scss` file found in `src/`
- **Styled Components:** `styled-components` in `dependencies` or `devDependencies`
- **Test runner:** `vitest` or `jest` in deps; check `package.json` scripts for clues
- **Storybook:** `.storybook/` directory exists or `@storybook/*` in deps

### `scanner.ts`

Crawls the codebase and extracts raw data. Returns a `ScanResult`:

```typescript
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

export interface ScanResult {
  components: ComponentInfo[];
  tokens: DesignTokens;
  inconsistencies: Inconsistency[]; // e.g. "6 similar greys found"
  stylingApproach: ProjectConfig["stylingApproach"];
}

export interface Inconsistency {
  type: "color" | "spacing" | "typography";
  message: string;
  values: string[];
  suggestedToken: string;
}
```

**Scanner logic:**

- Use `fast-glob` (already in runny) to find all `.tsx`, `.ts`, `.jsx`, `.js` files
- Ignore `node_modules`, `.next`, `dist`, `build`, `.git`, `coverage`
- For each file, use regex + simple AST heuristics to extract:
  - Component name (from default export or named export)
  - Props interface / type
  - Tailwind class names (regex: `/className[^"]*"([^"]*)"/g`)
  - CSS Module imports
  - Styled component definitions
- Extract all colour values and cluster near-duplicates (within 5% HSL distance)
- Extract spacing scale from Tailwind classes (`p-4`, `mt-8`, `gap-2`, etc.)

### `clusterer.ts`

Groups similar raw values into named tokens. This is where AI (via Claude Code) does the heavy lifting:

- Groups near-duplicate colours → suggests token names (`primary`, `background`, `muted`, etc.)
- Groups repeated spacing values → identifies the spacing scale
- Identifies component variant patterns ("these 4 button styles are variants of one component")
- Names are generated by Claude Code based on context of usage

### `generator.ts`

Writes files to `ui/`. Per component:

1. **`ComponentName.tsx`** — unified component with all variants as props
2. **`ComponentName.stories.tsx`** — Storybook stories, one per variant + edge cases
3. **`ComponentName.test.tsx`** — unit tests (render, props, interactions) + a11y via `@axe-core/react`
4. **`index.ts`** — re-export

Plus top-level:

- **`theme.ts`** — typed token exports
- **`tokens.ts`** — raw token values
- **`lumen.config.ts`** — project config written by lumen for future runs

**Styling approach determines output format:**

| Approach          | theme.ts format                      | Component styling            |
| ----------------- | ------------------------------------ | ---------------------------- |
| Tailwind          | Tailwind config extension object     | `cn()` utility + class names |
| CSS Modules       | CSS custom properties (`:root` vars) | `.module.css` per component  |
| Styled Components | `ThemeProvider` theme object         | `styled.*` components        |

### `watcher.ts`

File watcher for dashboard mode. Uses Node's `fs.watch` (or `chokidar` if needed):

- Watches `ui/` and `src/` for changes
- On change: re-runs scanner, emits updated results via WebSocket
- Debounced 500ms

### `ws/progress-stream.ts`

WebSocket for realtime scaffolding progress. Same pattern as runny's `log-stream.ts`:

```typescript
export type ProgressMessage =
  | { type: "scan_start" }
  | { type: "component_found"; name: string; filePath: string }
  | { type: "token_extracted"; token: string; value: string }
  | { type: "inconsistency"; message: string }
  | { type: "generate_start"; componentName: string }
  | { type: "generate_complete"; componentName: string }
  | { type: "complete"; summary: ScanSummary }
  | { type: "log"; stream: "stdout" | "stderr"; data: string };
```

---

## Client (`src/client/`)

### App Layout

```
┌─────────────────────────────────────────┐
│  Header (logo, project name, rescan btn) │
├──────────────────────┬──────────────────┤
│  ComponentTable      │  TokenPanel       │
│  (animated table,    │  (colour swatches,│
│  components added    │  spacing scale,   │
│  in realtime)        │  typography)      │
├──────────────────────┴──────────────────┤
│  TerminalPanel (xterm.js, collapsible)   │
└─────────────────────────────────────────┘
```

### `ComponentTable.tsx`

The main UI. Animated table where rows appear as components are discovered:

| Component | Variants | Tests | Coverage | A11y | Actions             |
| --------- | -------- | ----- | -------- | ---- | ------------------- |
| Button    | 4        | ✅    | 87%      | AA   | Replace in codebase |
| Input     | 2        | ✅    | 72%      | AA   | Replace in codebase |
| Badge     | 3        | ⚠️    | 41%      | A    | Replace in codebase |

- Rows animate in as WebSocket messages arrive (`component_found` events)
- Status badges use same `StatusBadge` pattern as runny
- "Replace in codebase" button opens `DiffModal`

### `TokenPanel.tsx`

Sidebar showing inferred design tokens:

- **Colours:** rendered as swatches with inferred names
- **Spacing:** visual scale (like a ruler)
- **Typography:** font size/weight samples
- **Inconsistencies:** highlighted in amber with explanation

### `DiffModal.tsx`

Opens when "Replace in codebase" is clicked:

- Shows a unified diff of every file that would change
- Checkbox per file to include/exclude
- Warns if git working tree is dirty
- Confirm button → sends request to server → Claude Code makes the changes
- This is the only destructive operation; everything else is additive

### `TerminalPanel.tsx`

Identical to runny's `TerminalPanel.tsx` — xterm.js panel showing raw CLI output. Collapsible. Shows Claude Code's output during scaffolding.

### Zustand Store (`store/lumen.ts`)

```typescript
interface LumenStore {
  config: ProjectConfig | null;
  scanResult: ScanResult | null;
  progress: ProgressMessage[];
  isScanning: boolean;
  selectedComponent: ComponentInfo | null;

  setConfig: (config: ProjectConfig) => void;
  setScanResult: (result: ScanResult) => void;
  addProgress: (msg: ProgressMessage) => void;
  setScanning: (scanning: boolean) => void;
  selectComponent: (component: ComponentInfo | null) => void;
}
```

---

## WebSocket Protocol

Same pattern as runny's `log-stream.ts`. Client subscribes on connect, server pushes `ProgressMessage` events during scaffolding. Client reconnects on disconnect.

---

## package.json

```json
{
  "name": "@icydotdev/lumen",
  "version": "0.1.0",
  "description": "Infer and scaffold your implicit React design system",
  "type": "module",
  "bin": {
    "lumen": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "dev:server": "tsx watch src/cli.ts",
    "dev:client": "vite",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "build": "npm run build:client && npm run build:server",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "express": "^5.1.0",
    "fast-glob": "^3.3.3",
    "open": "^10.1.0",
    "ws": "^8.18.0",
    "chokidar": "^3.6.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/ws": "^8.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.12.0",
    "@xterm/xterm": "^5.5.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^9.1.0",
    "lucide-react": "^0.468.0",
    "postcss": "^8.4.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "zustand": "^5.0.0"
  },
  "author": "Sam Kavanagh",
  "license": "MIT",
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "https://github.com/icydotdev/lumen"
  },
  "keywords": [
    "design-system",
    "react",
    "tailwind",
    "storybook",
    "components",
    "tokens",
    "a11y",
    "cli",
    "developer-tools"
  ]
}
```

---

## tsconfig.json / tsconfig.server.json

Identical to runny. Copy verbatim.

## vite.config.ts / tailwind.config.js / postcss.config.js

Identical to runny. Copy verbatim.

---

## What Claude Code Does (AI Layer)

When invoked via `claude -- npx @icydotdev/lumen`, Claude Code:

1. **Names tokens** — given clusters of colour/spacing values, suggests semantic names based on usage context
2. **Identifies component variants** — clusters visually similar components into a single unified component with variant props
3. **Writes component files** — generates `Button.tsx`, stories, and tests that are idiomatic, not just scaffolded
4. **Writes meaningful tests** — tests that test behaviour, not just "it renders"
5. **Writes a11y tests** — axe-core tests with specific WCAG criteria relevant to each component type
6. **Handles the DiffModal replacement** — when user confirms, Claude Code makes the actual codebase edits

Without Claude Code (future v2 standalone mode), the tool falls back to:

- Generic token naming (`color-1`, `color-2`)
- Structural scaffolding with TODO placeholders in tests/stories
- Still useful, but less polished

---

## v1 Scope (Ship This)

- [x] CLI entry point with `--dashboard` and `--dry-run` flags
- [x] Detector (styling approach, test runner, Storybook)
- [x] Scanner (components, colours, spacing, typography)
- [x] Clusterer (near-duplicate detection, inconsistency reporting)
- [x] Generator (ui/ folder, theme.ts, per-component files)
- [x] Dashboard (ComponentTable with realtime animation, TokenPanel, TerminalPanel)
- [x] DiffModal (preview before replace)
- [x] WebSocket progress stream
- [x] Tailwind support (primary)
- [x] CSS Modules support
- [x] Styled Components support
- [x] Inject `lumen` script into user's package.json

## Out of Scope (v2+)

- Standalone mode with direct Anthropic API key
- Hosted backend / SaaS monetisation
- Figma sync
- CI integration (GitHub Action)
- Vue / Svelte support
- Non-React frameworks

---

## Key Design Decisions

1. **Same stack as runny/nextmap** — no new tech to learn, faster to build, consistent feel across the @icydotdev suite
2. **Claude Code as AI layer in v1** — avoids auth/billing complexity, ships faster
3. **Additive by default** — lumen never modifies existing files without showing a diff first; `ui/` is always net-new
4. **Port 3719** — consistent with the suite (runny=3717, nextmap=3718)
5. **fast-glob for file discovery** — already proven in runny, handles ignore patterns well
6. **xterm.js terminal** — same as runny, users already familiar, shows Claude Code output transparently
