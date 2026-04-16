import fs from "fs";
import path from "path";
import nunjucks from "nunjucks";
import type { Review } from "../../shared/types.js";
import logger from "./logger.js";
import { fileURLToPath } from "url";
import { formatDate, getInitials } from "../../shared/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CLIENT_DIR must point to the directory nginx serves (e.g. /var/www/willa-ewa/client/dist).
// Templates are expected inside that directory under /templates.
const CLIENT_DIR =
  process.env.CLIENT_DIR ?? path.join(__dirname, "../../client");

const TEMPLATE_DIR = path.join(CLIENT_DIR, "templates");
const INDEX_PATH = path.join(CLIENT_DIR, "index.html");

nunjucks.configure(TEMPLATE_DIR, { autoescape: true });

export function generateHTMLReviews(reviews: Review[]): void {
  try {
    const html = fs.readFileSync(INDEX_PATH, "utf-8");

    const fragment = nunjucks.render("partials/reviews.njk", {
      reviews: reviews.map((rev) => ({
        ...rev,
        initials: getInitials(rev.author),
        date: formatDate(rev.time),
      })),
    });

    const updatedHTML = html.replace(
      /<!-- REVIEWS_START -->[\s\S]*?<!-- REVIEWS_END -->/,
      `<!-- REVIEWS_START -->\n${fragment}\n<!-- REVIEWS_END -->`,
    );

    fs.writeFileSync(INDEX_PATH, updatedHTML);
    logger.info("[generate] HTML updated");
  } catch (error) {
    logger.error("[generate] Error when generating HTML:", { error });
    throw error;
  }
}
