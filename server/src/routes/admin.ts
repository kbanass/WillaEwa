import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { generateHTMLReviews } from "../generate.js";
import { protectedRoute } from "../middleware/auth.js";
import logger from "../logger.js";
import { Statuses, type Review, type ReviewStatus } from "../types.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: "Password missing" });
    logger.warn("[admin][login] Password missing");
    return;
  }

  try {
    const admin = db
      .prepare("SELECT password FROM admin WHERE id = 1")
      .get() as { password: string } | undefined;

    if (!admin) {
      res.status(500).json({ error: "Admin account missing, run setup" });
      logger.error("[admin][login] Admin account missing, run setup");
      return;
    }

    const isCorrect = await bcrypt.compare(password, admin.password);

    if (!isCorrect) {
      res.status(401).json({ error: "Password is incorrect" });
      logger.warn("[admin][login] Password is incorrect");
      return;
    }

    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    res.json({ success: true });

    logger.info("[admin][login] New JWT created and sent to client");
  } catch (error) {
    logger.error("[admin][login] Login Error", { error });
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/logout", protectedRoute, (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ success: true });
  logger.info("[admin][logout] Logout successfull");
});

router.get("/reviews", protectedRoute, (_req: Request, res: Response) => {
  const reviews = db
    .prepare(
      `
      SELECT * FROM opinie 
      ORDER BY createdAt DESC
    `,
    )
    .all();

  res.json(reviews);
  logger.info("[admin][reviews] Reviews sent to client");
});

type StatusChange = Pick<Review, "id" | "status">;

function isValidStatusChange(z: unknown): z is StatusChange {
  return (
    typeof z === "object" &&
    z !== null &&
    "id" in z &&
    "status" in z &&
    Number.isInteger((z as StatusChange).id) &&
    Statuses.includes((z as StatusChange).status as ReviewStatus)
  );
}

router.post("/reviews/change-status", protectedRoute, (req, res) => {
  const { reviews } = req.body;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    res.status(400).json({ error: "No changes to make" });
    logger.error("[admin][reviews/change-status] No changes to make");
    return;
  }

  const changesArray = reviews as unknown[];

  const validChanges = changesArray.filter(isValidStatusChange);

  const invalidChanges = changesArray.filter((z) => !isValidStatusChange(z));

  if (invalidChanges.length > 0) {
    res.status(400).json({ error: "Invalid data", invalidChanges });
    logger.error(
      "[admin][reviews/change-status] Invalid data" + invalidChanges,
    );
    return;
  }

  const save = db.transaction((changes: StatusChange[]) => {
    const stmt = db.prepare(`UPDATE reviews SET status = ? WHERE id = ?`);
    for (const change of changes) {
      stmt.run(change.status, change.id);
    }
  });

  try {
    save(validChanges);

    logger.info(
      `[admin][reviews/change-status] ${validChanges.length} reviews statuses changed`,
    );

    const allAcceptedReviews = db
      .prepare(
        `
          SELECT * FROM reviews WHERE status = 'accepted' ORDER BY time DESC
        `,
      )
      .all() as Review[];

    generateHTMLReviews(allAcceptedReviews);

    logger.info(
      "[admin][reviews/change-status] Updated reviews saved to html page",
    );

    res.json({ success: true, updated: changesArray.length });
  } catch (error) {
    logger.error(
      "[admin][reviews/change-status] Error when changing statuses",
      { error },
    );
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
