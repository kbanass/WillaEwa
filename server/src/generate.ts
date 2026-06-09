import fs from "fs";
import path from "path";
import nunjucks from "nunjucks";
import type { Review } from "../../shared/types.js";
import logger from "./logger.js";
import { fileURLToPath } from "url";
import { formatDate, getInitials } from "../../shared/utils.js";
import { getGoogleAverageRating } from "./db.js";

// CLIENT_DIR must point to the directory nginx serves (e.g. /var/www/willa-ewa/client/dist).
// Templates are expected inside that directory under /templates.
const CLIENT_DIR =
  process.env.CLIENT_DIR ?? path.join(process.cwd(), "../client/dist");

const TEMPLATE_DIR = path.join(CLIENT_DIR, "templates");
const INDEX_PATH = path.join(CLIENT_DIR, "index.html");

nunjucks.configure(TEMPLATE_DIR, { autoescape: true });

function buildStarsHTML(rating: number): string {
  const full = Math.floor(rating);
  const half = (rating % 1) >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    '<div class="review-card__stars">' +
    '<div class="star star--filled"></div>'.repeat(full) +
    (half ? '<div class="star star--half"></div>' : "") +
    '<div class="star"></div>'.repeat(empty) +
    "</div>"
  );
}

export function generateHTMLReviews(reviews: Review[]): void {
  try {
    const html = fs.readFileSync(INDEX_PATH, "utf-8");

    // Średnia ze wszystkich opinii Google (nie tylko zaakceptowanych)
    const rawAvg = getGoogleAverageRating() ?? 5;
    const avgRating = Math.round(rawAvg * 10) / 10;   // do 1 miejsca po przecinku
    const roundedAvg = Math.round(rawAvg * 2) / 2;    // do 0.5 — na gwiazdki

    const fragment = nunjucks.render("partials/reviews.njk", {
      reviews: reviews.map((rev) => ({
        ...rev,
        initials: getInitials(rev.author),
        date: formatDate(rev.time),
        fullStars: Math.floor(rev.rating),
        halfStar: (rev.rating % 1) >= 0.5,
        emptyStars: 5 - Math.floor(rev.rating) - ((rev.rating % 1) >= 0.5 ? 1 : 0),
      })),
    });

    const updatedHTML = html
      .replace(
        /<!-- REVIEWS_START -->[\s\S]*?<!-- REVIEWS_END -->/,
        `<!-- REVIEWS_START -->\n${fragment}\n<!-- REVIEWS_END -->`,
      )
      .replace(
        /<!-- SCORE_STARS_START -->[\s\S]*?<!-- SCORE_STARS_END -->/,
        `<!-- SCORE_STARS_START -->${buildStarsHTML(roundedAvg)}<!-- SCORE_STARS_END -->`,
      )
      .replace(
        /<!-- SCORE_VALUE_START -->[\s\S]*?<!-- SCORE_VALUE_END -->/,
        `<!-- SCORE_VALUE_START --><h2>${avgRating.toFixed(1)}</h2><!-- SCORE_VALUE_END -->`,
      );

    fs.writeFileSync(INDEX_PATH, updatedHTML);
    logger.info("[generate] HTML updated");
  } catch (error) {
    logger.error("[generate] Error when generating HTML:", { error });
    throw error;
  }
}
