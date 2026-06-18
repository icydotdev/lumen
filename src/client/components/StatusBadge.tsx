import React from "react";
import { Check, AlertTriangle, X } from "lucide-react";

type Tone = "good" | "warn" | "bad" | "neutral";

const toneStyles: Record<Tone, string> = {
  good: "bg-lumen-green/15 text-lumen-green",
  warn: "bg-lumen-amber/15 text-lumen-amber",
  bad: "bg-lumen-red/15 text-lumen-red",
  neutral: "",
};

export function StatusBadge({
  tone,
  label,
  icon = false,
}: {
  tone: Tone;
  label: string;
  icon?: boolean;
}) {
  const Icon = tone === "good" ? Check : tone === "warn" ? AlertTriangle : X;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${toneStyles[tone]}`}
      style={
        tone === "neutral"
          ? { background: "var(--color-border)", color: "var(--color-muted)" }
          : undefined
      }
    >
      {icon && tone !== "neutral" && <Icon size={11} />}
      {label}
    </span>
  );
}

// Small dot indicator (mirrors runny's StatusBadge).
export function StatusDot({ tone }: { tone: Tone }) {
  const colors: Record<Tone, string> = {
    good: "bg-lumen-green",
    warn: "bg-lumen-amber",
    bad: "bg-lumen-red",
    neutral: "bg-gray-400",
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[tone]}`} />
  );
}
