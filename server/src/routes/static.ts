import { Router } from "express";
import { protectedRoute } from "../middleware/auth.js";
import path from "path";

import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_DIR =
  process.env.CLIENT_DIR ?? path.join(__dirname, "../../../client");

const router = Router();

router.get("/panel", protectedRoute, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "admin.html"));
});

router.get("/login", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "login.html"));
});


export default router;
