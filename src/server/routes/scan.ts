import { Router } from "express";
import { state } from "../services/state.js";

export function createScanRouter(): Router {
  const router = Router();

  router.get("/api/scan", (_req, res) => {
    res.json({ ...state.scanResult, scanning: state.scanning });
  });

  router.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  return router;
}
