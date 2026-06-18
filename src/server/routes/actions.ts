import { Router } from "express";
import { state } from "../services/state.js";
import {
  startStorybook,
  runTests,
  storybookState,
  testState,
} from "../services/process-runner.js";

// Dashboard-triggered processes: Storybook + test runner.
export function createActionsRouter(): Router {
  const router = Router();

  router.get("/api/storybook", (_req, res) => {
    res.json(storybookState);
  });

  router.post("/api/storybook", (_req, res) => {
    if (!state.config) {
      res.status(400).json({ error: "No project loaded" });
      return;
    }
    const s = startStorybook(state.config.rootPath, state.config.packageManager);
    res.json(s);
  });

  router.get("/api/test", (_req, res) => {
    res.json(testState);
  });

  router.post("/api/test", (req, res) => {
    if (!state.config) {
      res.status(400).json({ error: "No project loaded" });
      return;
    }
    const filter = req.body?.filter as string | undefined;
    const s = runTests(
      state.config.rootPath,
      state.config.packageManager,
      state.config.testRunner,
      filter
    );
    res.json(s);
  });

  return router;
}
