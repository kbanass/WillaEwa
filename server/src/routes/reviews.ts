import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db.js";
import logger from "../logger.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const { author, content, rating, email, website } = req.body;

  if (website && website.length > 0) {
    res.status(200).json({ success: true });
    logger.alert("[reviews][POST] Honeypot detected, request denied");
    return;
  }

  if (!author || !content || !rating) {
    res.status(400).json({ error: "Some fields are missing" });
    logger.info("[reviews][POST] Some fields are missing");
    return;
  }

  if (
    typeof content !== "string" ||
    content.length < 2 ||
    content.length > 1000
  ) {
    res
      .status(400)
      .json({ error: "Review has to be between 2 and 1000 characters long" });
    logger.info(
      "[reviews][POST] Review has to be between 2 and 1000 characters long",
    );
    return;
  }

  if (typeof author !== "string" || author.length < 2 || author.length > 100) {
    res.status(400).json({
      error: "Author name has to be between 2 and 100 characters long",
    });

    logger.info(
      "[reviews][POST] Author name has to be between 2 and 100 characters long",
    );

    return;
  }

  const ratingNum = Number(rating);
  if (
    isNaN(ratingNum) ||
    ratingNum < 0.5 ||
    ratingNum > 5 ||
    (ratingNum * 2) % 1 !== 0
  ) {
    res
      .status(400)
      .json({
        error: "Rating must be a number between 0.5 and 5 in 0.5 increments",
      });

    logger.info("[reviews][POST] Invalid rating value");
    return;
  }

  const linkRegex = /https?:\/\//i;
  if (linkRegex.test(content)) {
    res.status(400).json({ error: "Review can't contain links" });

    logger.info("[reviews][POST] Review can't contain links");
    return;
  }

  try {
    db.prepare(
      `INSERT INTO reviews (author, quote, rating, time, source, status, email)
       VALUES (?, ?, ?, ?, 'page', 'pending', ?)`,
    ).run(
      author,
      content,
      ratingNum,
      Math.floor(Date.now() / 1000),
      email ?? null,
    );

    res.status(201).json({
      success: true,
      message: "Review has been added and is now waiting for approval",
    });

    logger.info(
      "[review][POST] Review has been added and is now waiting for approval",
    );
  } catch (error) {
    logger.error("[opinie] Saving review error", error);
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
