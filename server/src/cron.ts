import cron from "node-cron";
import axios from "axios";
import { db } from "./db.js";
import { generateHTMLReviews } from "./generate.js";
import logger from "./logger.js";
import type { Review } from "./types.js";

interface GoogleReviews {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url: string;
}

async function getGoogleReviews(): Promise<void> {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id: process.env.GOOGLE_PLACE_ID,
          fields: "reviews",
          language: "pl",
          key: process.env.GOOGLE_API_KEY,
        },
      },
    );

    const reviews: GoogleReviews[] = response.data.result?.reviews ?? [];

    if (reviews.length === 0) {
      logger.warn("[cron] Google returned no reviews");
      return;
    }

    let newReviews = 0;

    for (const review of reviews) {
      const exists = db
        .prepare(
          `
          SELECT id FROM reviews 
          WHERE author = ? AND time = ?
          `,
        )
        .get(review.author_name, review.time);

      if (!exists) {
        db.prepare(
          `
          INSERT INTO reviews (author, content, rating, time, source, isAccepted)
          VALUES (?, ?, ?, ?, 'google', 1)
        `,
        ).run(review.author_name, review.text, review.rating, review.time);
        newReviews++;
      }
    }

    logger.info(`[cron] Saved ${newReviews} new reviews`);

    if (newReviews > 0) {
      const allSavedReviews = db
        .prepare(
          `
            SELECT * FROM reviews 
            WHERE isAccepted = 1 
            ORDER BY time DESC
          `,
        )
        .all() as Review[];

      generateHTMLReviews(allSavedReviews);
    }
  } catch (error) {
    logger.error("[cron] Error when downloading reviews from Google:", {
      error,
    });
  }
}

export function startCron(): void {
  cron.schedule("0 3 * * *", async () => {
    logger.info("[cron] Start downloading reviews from Google...");
    await getGoogleReviews();
  });

  logger.info("[cron] Google reviews download scheduled at 3:00");
}

export { getGoogleReviews };
