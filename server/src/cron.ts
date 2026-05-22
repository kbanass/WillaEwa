import { Cron } from "croner";
import logger from "./logger.js";
import { syncGoogleReviews } from "./syncGoogleReviews.js";

export function startCron(): void {
  const job = new Cron("0 4 * * *", async () => {
    syncGoogleReviews();
    logger.info(`[cron] Next Google reviews download: ${job.nextRun()}`);
  });

  logger.info(`[cron] Google reviews download scheduled at ${job.nextRun()}`);
}
