import { Router } from "express";
import {
  state,
  addReplaceRequest,
  markReplaceDone,
} from "../services/state.js";
import { progressBus } from "../services/progress-bus.js";

// Replace-in-codebase requests. The dashboard enqueues them; the driving AI
// drains the queue (it polls GET /api/requests at the end of its run).
export function createReplaceRouter(): Router {
  const router = Router();

  // Dashboard → enqueue a request. Body = { componentName, files }.
  router.post("/api/replace-request", (req, res) => {
    const { componentName, files = [] } = req.body ?? {};
    if (!componentName) {
      res.status(400).json({ error: "componentName required" });
      return;
    }
    const request = addReplaceRequest(componentName, files);
    progressBus.emitProgress({
      type: "log",
      stream: "stdout",
      data: `↻ replace requested: ${componentName}`,
    });
    res.json(request);
  });

  // AI → poll pending requests.
  router.get("/api/requests", (req, res) => {
    const status = req.query.status;
    const list =
      status === "pending"
        ? state.replaceRequests.filter((r) => r.status === "pending")
        : state.replaceRequests;
    res.json(list);
  });

  // AI → mark a request handled.
  router.post("/api/request-done", (req, res) => {
    const { id } = req.body ?? {};
    markReplaceDone(id);
    res.json({ ok: true });
  });

  return router;
}
