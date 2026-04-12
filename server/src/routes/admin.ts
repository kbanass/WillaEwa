import { Router } from "express";
import type { Request, Response } from "express";
import {
  changeReviewsStatuses,
  getAllReviews,
  getPublicReviews,
} from "../db.js";
import logger from "../logger.js";
import { protectedRoute } from "../middleware/auth.js";
import {
  Statuses,
  type ReviewStatus,
  type StatusChange,
} from "@shared/types.js";
import { generateHTMLReviews } from "../generate.js";

const router = Router();

router.get("/get-reviews", protectedRoute, (_req: Request, res: Response) => {
  try {
    const allReviews = getAllReviews();
    res.status(200).json({ reviews: allReviews });
  } catch (error) {
    logger.error("[admin][get-reviews] Error when querying db");
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/change-statuses", protectedRoute, (req, res) => {
  const { reviews } = req.body;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    res.status(400).json({ error: "No changes to make" });
    logger.error("[admin][reviews/change-statuses] No changes to make");
    return;
  }

  const changesArray = reviews as unknown[];

  const validChanges = changesArray.filter(isValidStatusChange);

  const invalidChanges = changesArray.filter((z) => !isValidStatusChange(z));

  if (invalidChanges.length > 0) {
    res
      .status(400)
      .json({ error: "Invalid data", invalidChanges: invalidChanges });
    logger.error("[admin][change-statuses] Invalid data" + invalidChanges);
    return;
  }

  try {
    changeReviewsStatuses(validChanges);

    logger.info(
      `[admin][change-statuses] ${validChanges.length} reviews statuses changed`,
    );

    const allPublicReviews = getPublicReviews();

    generateHTMLReviews(allPublicReviews);

    res.json({ success: true, updated: validChanges.length });
  } catch (error) {
    logger.error("[admin][change-statuses] Error when changing statuses", {
      error,
    });
    res.status(500).json({ error: "Server Error" });
  }
});

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

export default router;
