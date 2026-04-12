import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { protectedRoute } from "../middleware/auth.js";
import logger from "../logger.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: "Password missing" });
    logger.warn("[auth][Login] Password missing");
    return;
  }

  try {
    const admin = db
      .prepare("SELECT password FROM admin WHERE id = 1")
      .get() as { password: string } | undefined;

    if (!admin) {
      res.status(500).json({ error: "Admin account missing, run setup" });
      logger.error("[auth][login] Admin account missing, run setup");
      return;
    }

    const isCorrect = await bcrypt.compare(password, admin.password);

    if (!isCorrect) {
      res.status(401).json({ error: "Password is incorrect" });
      logger.warn("[auth][login] Password is incorrect");
      return;
    }

    const EXPIRY_MS = 72 * 60 * 60 * 1000; // 72h

    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, {
      expiresIn: EXPIRY_MS,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: EXPIRY_MS,
      sameSite: "strict",
    });

    res.json({ success: true });

    logger.info("[auth][login] New JWT created and sent to client");
  } catch (error) {
    logger.error("[auth][login] Login Error", { error });
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/logout", protectedRoute, (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ success: true });
  logger.info("[auth][logout] Logout successful");
});

export default router;
