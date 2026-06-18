import React from "react";

// Thin coverage/health bar shown per component.
export function HealthBar({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-xs" style={{ color: "var(--color-muted)" }}>
        —
      </span>
    );
  }

  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-16 rounded-full overflow-hidden"
        style={{ background: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span
        className="text-xs tabular-nums"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {value}%
      </span>
    </div>
  );
}
