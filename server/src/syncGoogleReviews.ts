import { insertReview } from "./db.js";
import logger from "./logger.js";
import { importGoogleReviews } from "./serpApi.js";

export async function syncGoogleReviews() {
  logger.info("[cron] Start downloading reviews from Google...");

  const newGoogleReviews = await importGoogleReviews();

  logger.info(
    `[cron] ${newGoogleReviews?.length} new reviews downloaded, start saving`,
  );

  let savedWithSuccess = 0;

  for (const review of newGoogleReviews ?? []) {
    try {
      insertReview(review);
      savedWithSuccess++;
    } catch (error) {
      logger.error(
        `[cron] Failed to insert review ${review.googleReviewId}`,
        error,
      );
    }
  }

  logger.info(
    `[cron] ${savedWithSuccess} new reviews saved, waiting for approval`,
  );
}
