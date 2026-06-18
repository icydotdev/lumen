import { Router } from "express";
import { state } from "../services/state.js";

export function createConfigRouter(): Router {
  const router = Router();

  router.get("/api/config", (_req, res) => {
    res.json(state.config);
  });

  return router;
}
