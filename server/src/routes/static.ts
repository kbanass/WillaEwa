import { Router } from "express";
import { protectedRoute } from "../middleware/auth.js";
import path from "path";

const CLIENT_DIR =
  process.env.CLIENT_DIR ?? path.join(process.cwd(), "../client/dist");

const router = Router();

router.get("/panel", protectedRoute, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "admin.html"));
});

router.get("/login", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "login.html"));
});


export default router;
