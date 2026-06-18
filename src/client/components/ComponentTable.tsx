import React, { useState } from "react";
import { Loader2, Replace, Sparkles, BookOpen } from "lucide-react";
import { useStore } from "../store/lumen";
import { openInStorybook } from "../hooks/useActions";
import type { ComponentInfo } from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { HealthBar } from "./HealthBar";
import { DiffModal } from "./DiffModal";

function IdleScreen() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ color: "var(--color-muted)" }}
    >
      <div className="text-center">
        <Sparkles size={40} className="mx-auto mb-4 text-lumen-accent" />
        <p className="text-sm" style={{ color: "var(--color-text)" }}>
          Waiting to scan…
        </p>
        <p className="text-xs mt-1">Run the skill to extract your design system.</p>
      </div>
    </div>
  );
}

function ScanningState() {
  return (
    <div className="flex-1 overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={18} className="text-lumen-accent animate-pulse" />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            Inferring your design system…
          </p>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Reading components, clustering tokens. Rows appear as they're found.
          </p>
        </div>
      </div>
      {/* animated prism beam */}
      <div className="flex flex-col gap-1.5 mb-7 max-w-xs">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 rounded-full lumen-beam"
            style={{
              background:
                ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#8b5cf6"][i],
              animationDelay: `${i * 0.12}s`,
              width: `${60 + i * 8}%`,
            }}
          />
        ))}
      </div>
      {/* skeleton rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4" style={{ opacity: 1 - i * 0.13 }}>
            <div className="h-3 rounded lumen-shimmer" style={{ width: "18%" }} />
            <div className="h-3 rounded lumen-shimmer" style={{ width: "6%" }} />
            <div className="h-3 rounded lumen-shimmer" style={{ width: "8%" }} />
            <div className="h-3 rounded lumen-shimmer" style={{ width: "10%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComponentTable() {
  const components = useStore((s) => s.components);
  const generating = useStore((s) => s.generating);
  const completed = useStore((s) => s.completed);
  const started = useStore((s) => s.started);
  const isScanning = useStore((s) => s.isScanning);
  const selectComponent = useStore((s) => s.selectComponent);
  const selected = useStore((s) => s.selectedComponent);
  const [diffFor, setDiffFor] = useState<ComponentInfo | null>(null);

  if (components.length === 0) {
    if (isScanning) return <ScanningState />;
    if (!started) return <IdleScreen />;
  }

  const rows = [...components].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr style={{ background: "var(--color-surface)" }}>
            {["Component", "Variants", "Tests", "Coverage", "A11y", ""].map((h) => (
              <th
                key={h}
                className="text-left font-medium px-4 py-2.5 text-xs uppercase tracking-wide"
                style={{
                  color: "var(--color-muted)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const isSelected = selected?.name === c.name;
            const isGenerating = generating.has(c.name);
            const isDone = completed.has(c.name);
            return (
              <tr
                key={c.name}
                onClick={() => selectComponent(c)}
                className="lumen-row-in cursor-pointer transition-colors"
                style={{
                  background: isSelected ? "var(--color-hover)" : undefined,
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {isGenerating ? (
                      <Loader2 size={13} className="animate-spin text-lumen-accent" />
                    ) : isDone ? (
                      <span className="w-2 h-2 rounded-full bg-lumen-green shrink-0" />
                    ) : (
                      <span className="w-[13px]" />
                    )}
                    <span style={{ color: "var(--color-text)" }}>{c.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {c.filePath}
                  </span>
                </td>
                <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                  {c.variants.length || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    tone={c.hasTests ? "good" : "warn"}
                    label={c.hasTests ? "yes" : "none"}
                    icon
                  />
                </td>
                <td className="px-4 py-2.5">
                  <HealthBar value={c.testCoverage} />
                </td>
                <td className="px-4 py-2.5">
                  {c.a11yScore != null ? (
                    <StatusBadge
                      tone={c.a11yScore >= 90 ? "good" : "warn"}
                      label={c.a11yScore >= 90 ? "AA" : "A"}
                    />
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInStorybook(c.name);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md hover:bg-lumen-accent/10"
                      style={{ color: "var(--color-text-secondary)" }}
                      title="Open in Storybook"
                    >
                      <BookOpen size={12} />
                      Storybook
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiffFor(c);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md hover:bg-lumen-accent/10"
                      style={{ color: "var(--color-text-secondary)" }}
                      title="Replace existing instances in the codebase"
                    >
                      <Replace size={12} />
                      Replace
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {diffFor && <DiffModal component={diffFor} onClose={() => setDiffFor(null)} />}
    </div>
  );
}
