import { Router } from "express";
import { protectedRoute } from "../middleware/auth.js";
import path from "path";

const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(process.cwd(), "../astro/dist");

const router = Router();

router.get("/panel", protectedRoute, (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "panel.html"));
});

router.get("/login", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "login.html"));
});

export default router;
