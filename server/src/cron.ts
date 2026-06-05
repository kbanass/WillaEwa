import { Cron } from "croner";
import logger from "./logger.js";
import { syncGoogleReviews } from "./syncGoogleReviews.js";
import { sendDailySummary } from "./telegramTransport.js";

export function startCron(): void {
  const googleJob = new Cron("0 4 * * *", async () => {
    syncGoogleReviews();
    logger.info(`[cron] Next Google reviews download: ${googleJob.nextRun()}`);
  });

  new Cron("0 19 * * *", async () => {
    await sendDailySummary();
  });

  logger.info(`[cron] Google reviews download scheduled at ${googleJob.nextRun()}`);
}
