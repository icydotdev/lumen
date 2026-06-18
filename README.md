# @icydotdev/lumen

> Infer and scaffold your implicit React design system.

Lumen scans a React codebase, infers the design system already hiding in your
components (colours, spacing, typography, variants), and scaffolds a structured
`ui/` folder — theme, organised components, Storybook stories, accessibility
tests, and unit tests. A local dashboard streams the work in realtime and gives
you ongoing design-system health monitoring.

Part of the [@icydotdev](https://github.com/icydotdev) suite, alongside
[`runny`](https://github.com/icydotdev/runny) and
[`nextmap`](https://github.com/icydotdev/nextmap).

## Usage

Lumen is the **engine** behind the `extract-design-system` skill. You normally
drive it through the skill, not by hand:

```bash
# once — installs the skill (prompts for project vs global)
npx skills add icydotdev/skills --skill extract-design-system
```

Then, in Claude Code (or any supported agent):

```
/extract-design-system
```

The skill runs the Lumen engine, scans your codebase, and scaffolds `ui/` while
the dashboard visualises it live. Claude is the AI layer — no API key required.

### Running the engine directly

```bash
npx @icydotdev/lumen --serve       # dashboard + ingest API, for an AI to drive
npx @icydotdev/lumen --dashboard   # ongoing dashboard for an already-scaffolded project
npx @icydotdev/lumen --fallback    # deterministic scaffold, no AI (TODO stubs)
```

After a run, a `lumen` script is added to your `package.json`:

```bash
npm run lumen
```

## Options

```
Usage: lumen [options]

  --dashboard       Launch dashboard only (no scaffolding), for ongoing use
  --no-browser      Don't open the browser automatically
  --port <number>   Port to run on (default: 3719)
  --dry-run         Show what would be generated without writing files
  -h, --help        Show this help message
```

## What gets generated

```
ui/
├── components/
│   └── Button/
│       ├── Button.tsx           # Unified component with variant props
│       ├── Button.stories.tsx   # Storybook stories, one per variant
│       ├── Button.test.tsx      # Unit tests + a11y (axe-core)
│       └── index.ts             # Re-export
├── theme.ts                     # Typed token exports
├── tokens.ts                    # Raw inferred token values
├── lib/cn.ts                    # className combiner (Tailwind path)
└── lumen.config.ts             # Config for future runs
```

Lumen is **additive by default** — `ui/` is always net-new and existing files
are never modified without showing a diff first.

## Supported styling approaches

Detection is non-exclusive; a project may use several.

| Approach          | Detection signal                                   |
| ----------------- | -------------------------------------------------- |
| Tailwind          | `tailwind.config.*` exists                         |
| CSS Modules       | `.module.css` / `.module.scss` files present       |
| Styled Components | `styled-components` in dependencies                |

> **v1 constraint:** Tailwind + React is the primary, best-supported target.
> CSS Modules and Styled Components are detected and respected but produce
> less polished output for now.

## How the AI layer works

When invoked via `claude -- npx @icydotdev/lumen`, Claude Code names tokens from
usage context, clusters similar components into unified variants, and writes
idiomatic components, stories, and behaviour-focused tests. Without Claude Code,
Lumen still produces structural scaffolding with generic token names and TODO
placeholders — useful, but less polished.

## Development

```bash
npm install
npm run dev      # server (tsx watch) + client (vite) concurrently
npm run build    # build client (vite) + server (tsc)
```

## License

MIT © Sam Kavanagh
