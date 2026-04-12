import { Cron } from "croner";
import logger from "./logger.js";
import { importGoogleReviews } from "./serpApi.js";
import { insertReview } from "./db.js";

export function startCron(): void {
  const job = new Cron("* 5 * * *", async () => {
    logger.info("[cron] Start downloading reviews from Google...");

    const newGoogleReviews = await importGoogleReviews();

    logger.info(
      `[cron] ${newGoogleReviews?.length} new reviews downloaded, start saving new reviews`,
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
      `[cron] ${savedWithSuccess} new reviews saved with success, are now waiting for approval`,
    );

    logger.info(`[cron] Next Google reviews download: ${job.nextRun()}`);
  });

  logger.info(`[cron] Google reviews download scheduled at ${job.nextRun()}`);
}
