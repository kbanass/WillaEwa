import "dotenv/config";
import { getPublicReviews } from "../db.js";
import { generateHTMLReviews } from "../generate.js";

const reviews = getPublicReviews();
generateHTMLReviews(reviews);
console.log(`[generateHTML] Generated HTML with ${reviews.length} reviews`);
