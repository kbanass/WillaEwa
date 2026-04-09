import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function protectedRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Brak autoryzacji" });
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    res.status(401).json({ error: "Nieważny lub wygasły token" });
  }
}
