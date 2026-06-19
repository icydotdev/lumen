import React, { useState } from "react";
import { Moon, Sun, RefreshCw, BookOpen, FlaskConical, Loader2 } from "lucide-react";
import { useStore } from "../store/lumen";
import { useThemeStore } from "../hooks/useTheme";
import { useRefresh } from "../hooks/useScan";
import { useActions, openStorybook, triggerTests } from "../hooks/useActions";
import logoSvg from "../assets/logo.svg";

export function Header() {
  const config = useStore((s) => s.config);
  const isScanning = useStore((s) => s.isScanning);
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const refresh = useRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const sb = useActions((s) => s.storybook);
  const test = useActions((s) => s.test);
  const hasComponents = useStore((s) => s.components.length > 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const busy = isScanning || refreshing;

  return (
    <header
      className="h-14 flex items-center justify-between px-5 shrink-0"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <a
          href="https://www.npmjs.com/package/@icydotdev/lumen"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src={logoSvg} alt="Lumen" className="w-7 h-7" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-lumen-accent">
              lumen
            </span>
            <span
              className="text-[10px] tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              react design system extractor
            </span>
          </span>
        </a>
        {config && (
          <>
            <span style={{ color: "var(--color-muted)" }}>/</span>
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {config.projectName}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {config?.stylingApproach.map((s) => (
          <span
            key={s}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "var(--color-border)", color: "var(--color-muted)" }}
          >
            {s}
          </span>
        ))}
        {hasComponents && (
          <>
            <button
              onClick={() => openStorybook()}
              disabled={sb.status === "starting"}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors hover:bg-lumen-accent/10 disabled:opacity-50"
              style={{ color: "var(--color-text-secondary)" }}
              title="Open Storybook"
            >
              {sb.status === "starting" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <BookOpen size={13} />
              )}
              {sb.status === "starting" ? "Starting…" : "Storybook"}
            </button>
            <button
              onClick={() => triggerTests()}
              disabled={test.status === "running"}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors hover:bg-lumen-accent/10 disabled:opacity-50"
              style={{
                color:
                  test.status === "passed"
                    ? "#22c55e"
                    : test.status === "failed"
                      ? "#ef4444"
                      : "var(--color-text-secondary)",
              }}
              title="Run tests"
            >
              {test.status === "running" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FlaskConical size={13} />
              )}
              {test.status === "running" ? "Testing…" : "Run tests"}
            </button>
          </>
        )}
        <button
          onClick={handleRefresh}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors hover:bg-lumen-accent/10 disabled:opacity-50"
          style={{ color: "var(--color-text-secondary)" }}
          title="Refresh"
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
          {isScanning ? "Scanning..." : "Refresh"}
        </button>
        <button
          onClick={toggle}
          className="p-1.5 rounded-md transition-colors hover:bg-lumen-accent/10"
          style={{ color: "var(--color-muted)" }}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
