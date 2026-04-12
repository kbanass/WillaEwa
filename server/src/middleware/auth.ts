import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../logger.js";

export function protectedRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    logger.warn("[auth-middleware] Token not included in request");
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    logger.warn("[auth-middleware] Unauthorized request!", req);
    res.status(401).json({ error: "Token expired" });
  }
}
