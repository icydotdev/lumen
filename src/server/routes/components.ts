import { Router } from "express";
import { state } from "../services/state.js";

export function createComponentsRouter(): Router {
  const router = Router();

  router.get("/api/components", (_req, res) => {
    res.json(state.scanResult?.components ?? []);
  });

  return router;
}
