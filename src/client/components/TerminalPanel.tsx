import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { useStore, type ProgressMessage } from "../store/lumen";
import { useThemeStore } from "../hooks/useTheme";
import "@xterm/xterm/css/xterm.css";

const DARK_THEME = {
  background: "#0f1117",
  foreground: "#e5e7eb",
  cursor: "#8b5cf6",
  selectionBackground: "#8b5cf640",
};

const LIGHT_THEME = {
  background: "#fafbfc",
  foreground: "#1a1d27",
  cursor: "#8b5cf6",
  selectionBackground: "#8b5cf640",
};

function formatLine(msg: ProgressMessage): string | null {
  switch (msg.type) {
    case "scan_start":
      return "\x1b[35m▸ Scanning codebase...\x1b[0m";
    case "component":
      return `\x1b[36m  found\x1b[0m ${msg.component.name} \x1b[90m${msg.component.filePath}\x1b[0m`;
    case "token":
      return `\x1b[33m  token\x1b[0m ${msg.kind}.${msg.name} = ${msg.value}`;
    case "inconsistency":
      return `\x1b[33m  ⚠ ${msg.inconsistency.message}\x1b[0m`;
    case "generating":
      return `\x1b[35m  writing\x1b[0m ${msg.name}/`;
    case "generated":
      return `\x1b[32m  ✓\x1b[0m ${msg.name}`;
    case "complete":
      return `\x1b[32m▸ Done — ${msg.summary.componentCount} components, ${msg.summary.tokenCount} tokens, ${msg.summary.inconsistencyCount} issues\x1b[0m`;
    case "log":
      return msg.stream === "stderr" ? `\x1b[31m${msg.data}\x1b[0m` : msg.data;
    default:
      return null;
  }
}

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const writtenRef = useRef(0);
  const progress = useStore((s) => s.progress);
  const theme = useThemeStore((s) => s.theme);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || collapsed) return;

    const terminal = new XTerminal({
      theme: theme === "dark" ? DARK_THEME : LIGHT_THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminalRef.current = terminal;

    // Replay everything we already have.
    writtenRef.current = 0;
    for (const msg of useStore.getState().progress) {
      const line = formatLine(msg);
      if (line !== null) terminal.writeln(line);
      writtenRef.current++;
    }

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [collapsed]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme =
        theme === "dark" ? DARK_THEME : LIGHT_THEME;
    }
  }, [theme]);

  // Write only the new messages since last render.
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    for (let i = writtenRef.current; i < progress.length; i++) {
      const line = formatLine(progress[i]);
      if (line !== null) terminal.writeln(line);
    }
    writtenRef.current = progress.length;
  }, [progress]);

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg)",
        height: collapsed ? "2.5rem" : "16rem",
      }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="h-10 flex items-center px-4 gap-2 shrink-0 w-full text-left"
        style={{
          background: "var(--color-surface)",
          borderBottom: collapsed ? "none" : "1px solid var(--color-border)",
        }}
      >
        <Terminal size={14} style={{ color: "var(--color-muted)" }} />
        <span className="text-sm" style={{ color: "var(--color-text)" }}>
          Output
        </span>
        <span className="ml-auto" style={{ color: "var(--color-muted)" }}>
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {!collapsed && (
        <div className="flex-1 relative">
          <div ref={containerRef} className="absolute inset-0 p-2" />
        </div>
      )}
    </div>
  );
}
