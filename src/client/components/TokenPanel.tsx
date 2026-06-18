import React from "react";
import { AlertTriangle } from "lucide-react";
import { useStore } from "../store/lumen";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3
        className="text-xs uppercase tracking-wide font-medium mb-2.5"
        style={{ color: "var(--color-muted)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// Resolve a token value to a CSS colour for the swatch preview.
function swatchColor(value: string): string {
  if (value.startsWith("#") || /^(rgb|hsl)/.test(value)) return value;
  return "var(--color-border)"; // Tailwind class — no literal colour to show
}

export function TokenPanel() {
  const tokens = useStore((s) => s.tokens);
  const inconsistencies = useStore((s) => s.inconsistencies);

  const colors = tokens.colors;
  const spacing = tokens.spacing;
  const typography = tokens.typography;

  const hasColors = Object.keys(colors).length > 0;

  return (
    <aside
      className="w-80 shrink-0 overflow-auto p-5"
      style={{
        background: "var(--color-surface)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      <Section title="Colours">
        {hasColors ? (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(colors).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded shrink-0"
                  style={{
                    background: swatchColor(value),
                    border: "1px solid var(--color-border)",
                  }}
                />
                <div className="min-w-0">
                  <div
                    className="text-xs truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {name}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            No colours inferred yet
          </p>
        )}
      </Section>

      <Section title="Spacing">
        {Object.keys(spacing).length > 0 ? (
          <div className="space-y-1.5">
            {Object.entries(spacing).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <div
                  className="h-2 rounded-sm bg-lumen-accent/50"
                  style={{ width: value.endsWith("rem") ? value : "0.5rem" }}
                />
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {name}
                </span>
                <span className="text-[10px] ml-auto" style={{ color: "var(--color-muted)" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            No spacing scale inferred yet
          </p>
        )}
      </Section>

      <Section title="Typography">
        {Object.keys(typography).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(typography).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {name}
                </span>
                <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            No typography inferred yet
          </p>
        )}
      </Section>

      {inconsistencies.length > 0 && (
        <Section title="Inconsistencies">
          <div className="space-y-2">
            {inconsistencies.map((inc, i) => (
              <div
                key={i}
                className="flex gap-2 p-2 rounded-md"
                style={{ background: "rgba(245, 158, 11, 0.1)" }}
              >
                <AlertTriangle size={13} className="text-lumen-amber shrink-0 mt-0.5" />
                <span className="text-xs text-lumen-amber">{inc.message}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}
