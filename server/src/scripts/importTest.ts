import logger from "../logger.js";
import { importGoogleReviews } from "../serpApi.js";

async function importTest() {
  try {
    const newReviews = await importGoogleReviews();

    logger.info(
      `[test] Test result: imported ${newReviews?.length} new Google reviews`,
    );
    newReviews?.forEach((r) => {
      console.log(r);
    });
  } catch (error) {
    logger.error("[test] Test error", error);
  }
}

await importTest();
