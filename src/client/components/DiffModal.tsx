import React, { useState } from "react";
import { X, FileText, AlertTriangle, GitBranch, Check } from "lucide-react";
import type { ComponentInfo } from "../lib/api";
import { requestReplace } from "../lib/api";
import { useStore } from "../store/lumen";

// Preview of the files that replacing this component in the codebase would touch.
// The actual edits are performed by Claude Code (the AI layer) on confirm.
export function DiffModal({
  component,
  onClose,
}: {
  component: ComponentInfo;
  onClose: () => void;
}) {
  const config = useStore((s) => s.config);
  const uiPath = `ui/components/${component.name}`;

  const files = [
    { path: component.filePath, note: "existing usage → import from ui/" },
    { path: `${uiPath}/${component.name}.tsx`, note: "unified component" },
    { path: `${uiPath}/${component.name}.stories.tsx`, note: "stories" },
    { path: `${uiPath}/${component.name}.test.tsx`, note: "tests + a11y" },
  ];

  const [included, setIncluded] = useState<Set<string>>(
    new Set(files.map((f) => f.path))
  );

  const toggle = (p: string) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  const [queued, setQueued] = useState(false);
  const apply = async () => {
    await requestReplace(component.name, [...included]);
    setQueued(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Replace />
            <span className="font-medium" style={{ color: "var(--color-text)" }}>
              Replace {component.name} in codebase
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto p-5 space-y-3">
          <div
            className="flex gap-2 p-3 rounded-md"
            style={{ background: "rgba(245, 158, 11, 0.1)" }}
          >
            <GitBranch size={15} className="text-lumen-amber shrink-0 mt-0.5" />
            <p className="text-xs text-lumen-amber">
              Commit or stash first — these edits modify existing files. Apply
              queues the request; Claude picks it up at the end of this run and
              repoints usages to <code>ui/</code> so you can review the diff before
              committing.
            </p>
          </div>

          {files.map((f) => (
            <label
              key={f.path}
              className="flex items-center gap-3 p-2.5 rounded-md cursor-pointer hover:bg-lumen-accent/5"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <input
                type="checkbox"
                checked={included.has(f.path)}
                onChange={() => toggle(f.path)}
                className="accent-lumen-accent"
              />
              <FileText size={14} style={{ color: "var(--color-muted)" }} />
              <div className="min-w-0">
                <div className="text-xs truncate" style={{ color: "var(--color-text)" }}>
                  {f.path}
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                  {f.note}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            {included.size} file{included.size === 1 ? "" : "s"} selected
            {config && ` · ${config.projectName}`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
            >
              {queued ? "Close" : "Cancel"}
            </button>
            <button
              onClick={apply}
              disabled={queued || included.size === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-lumen-accent text-white hover:opacity-90 disabled:opacity-60"
              title="Queue this replacement for Claude to apply"
            >
              {queued ? <Check size={12} /> : <AlertTriangle size={12} />}
              {queued ? "Queued for Claude" : "Apply with Claude Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Replace() {
  return (
    <span className="text-lumen-accent">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2" />
        <path d="M10 20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2" />
        <path d="m3 7 3-3 3 3" />
        <path d="m21 17-3 3-3-3" />
      </svg>
    </span>
  );
}
