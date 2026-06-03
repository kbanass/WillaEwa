import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { syncGoogleReviews } from "../syncGoogleReviews.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

(async () => {
  await syncGoogleReviews();
  process.exit(0);
})();
