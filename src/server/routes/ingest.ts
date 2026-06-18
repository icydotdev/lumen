import { Router } from "express";
import type { ProgressMessage } from "../types.js";
import { applyMessage } from "../services/state.js";
import { progressBus } from "../services/progress-bus.js";

// Endpoints the AI (Claude) calls while it scans and scaffolds.
// Each updates accumulated state and broadcasts to the dashboard over WS.
export function createIngestRouter(): Router {
  const router = Router();

  const push = (msg: ProgressMessage) => {
    applyMessage(msg);
    progressBus.emitProgress(msg);
  };

  // Start a fresh scan (clears the table, shows progress).
  router.post("/api/scan-start", (_req, res) => {
    push({ type: "scan_start" });
    res.json({ ok: true });
  });

  // A discovered/unified component. Body = full ComponentInfo.
  router.post("/api/component", (req, res) => {
    push({ type: "component", component: req.body });
    res.json({ ok: true });
  });

  // A named design token. Body = { kind, name, value }.
  router.post("/api/token", (req, res) => {
    const { kind, name, value } = req.body ?? {};
    push({ type: "token", kind, name, value });
    res.json({ ok: true });
  });

  // An inconsistency found. Body = Inconsistency.
  router.post("/api/inconsistency", (req, res) => {
    push({ type: "inconsistency", inconsistency: req.body });
    res.json({ ok: true });
  });

  // Mark a component as being written / finished writing to ui/.
  router.post("/api/generating", (req, res) => {
    push({ type: "generating", name: req.body?.name });
    res.json({ ok: true });
  });
  router.post("/api/generated", (req, res) => {
    push({ type: "generated", name: req.body?.name });
    res.json({ ok: true });
  });

  // Everything done. Body = ScanSummary.
  router.post("/api/complete", (req, res) => {
    push({ type: "complete", summary: req.body });
    res.json({ ok: true });
  });

  // Free-form log line surfaced in the terminal panel.
  router.post("/api/log", (req, res) => {
    const { stream = "stdout", data = "" } = req.body ?? {};
    push({ type: "log", stream, data });
    res.json({ ok: true });
  });

  return router;
}
