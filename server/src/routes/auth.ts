import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { protectedRoute } from "../middleware/auth.js";
import logger from "../logger.js";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many login attempts",
});

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: "Podaj hasło" });
    logger.warn("[auth][Login] Password missing");
    return;
  }

  try {
    const admin = db
      .prepare("SELECT password FROM admin WHERE id = 1")
      .get() as { password: string } | undefined;

    if (!admin) {
      res.status(500).json({ error: "Brak konta admina, błąd serwera" });
      logger.error("[auth][login] Admin account missing, run setup");
      return;
    }

    const isCorrect = await bcrypt.compare(password, admin.password);

    if (!isCorrect) {
      res.status(401).json({ error: "Nieprawidłowe hasło" });
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

router.get("/verify", (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ authenticated: false });
    return;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    res.json({ authenticated: true });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

router.post("/logout", protectedRoute, (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ success: true });
  logger.info("[auth][logout] Logout successful");
});

export default router;
