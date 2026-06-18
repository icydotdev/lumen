import React, { useState } from "react";
import { Loader2, Replace, Sparkles } from "lucide-react";
import { useStore } from "../store/lumen";
import type { ComponentInfo } from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { HealthBar } from "./HealthBar";
import { DiffModal } from "./DiffModal";

function LoadingScreen() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ color: "var(--color-muted)" }}
    >
      <div className="text-center">
        <Sparkles size={40} className="mx-auto mb-4 text-lumen-accent animate-pulse" />
        <p className="text-sm" style={{ color: "var(--color-text)" }}>
          Inferring your design system…
        </p>
        <p className="text-xs mt-1">
          Components appear here as they're discovered.
        </p>
      </div>
    </div>
  );
}

export function ComponentTable() {
  const components = useStore((s) => s.components);
  const generating = useStore((s) => s.generating);
  const completed = useStore((s) => s.completed);
  const started = useStore((s) => s.started);
  const selectComponent = useStore((s) => s.selectComponent);
  const selected = useStore((s) => s.selectedComponent);
  const [diffFor, setDiffFor] = useState<ComponentInfo | null>(null);

  if (!started && components.length === 0) return <LoadingScreen />;

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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiffFor(c);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md hover:bg-lumen-accent/10"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Replace size={12} />
                    Replace
                  </button>
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
