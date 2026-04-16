import { syncGoogleReviews } from "../syncGoogleReviews.js";

(async () => {
  await syncGoogleReviews();
  process.exit(0);
})();
