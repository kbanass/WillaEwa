import "dotenv/config";
import { getJson } from "serpapi";
import type { GoogleReview, ReviewStatus } from "@shared/types.js";
import logger from "./logger.js";
import { googleReviewExists } from "./db.js";

type GoogleReviewApiResponse = {
  position: number;
  link: string;
  rating: number;
  date: string;
  iso_date: string;
  iso_date_of_last_edit: string;
  images: Array<string>;
  source: "Google";
  review_id: string;
  user: {
    name: string;
  };
  snippet: string;
  extracted_snippet: any;
  likes: number;
  response: any;
};

export const importGoogleReviews = async () => {
  const newReviews: Array<GoogleReview> = [];
  let nextPageToken: string | undefined;

  try {
    do {
      const response = await getJson({
        engine: "google_maps_reviews",
        place_id: process.env.GOOGLE_PLACE_ID,
        hl: "pl",
        api_key: process.env.SERPAPI_API_KEY,
        ...(nextPageToken && { next_page_token: nextPageToken }),
      });

      const reviews: Array<GoogleReview> = (response.reviews ?? []).map(
        (r: GoogleReviewApiResponse) => mapReview(r),
      );

      const unsaved = reviews.filter(
        (r) => !googleReviewExists(r.googleReviewId),
      );

      newReviews.push(...unsaved);

      if (unsaved.length === 0) {
        logger.info(
          "[importGoogleReviews] All reviews on this page already exist, stopping pagination",
        );
        break;
      }

      nextPageToken = response.serpapi_pagination?.next_page_token;
    } while (nextPageToken);

    return newReviews;
  } catch (error) {
    logger.error("[importGoogleReviews] Error when importing Google reviews:", {
      error,
    });
  }
};

function mapReview(r: GoogleReviewApiResponse): GoogleReview {
  return {
    googleReviewId: r.review_id,
    author: r.user.name,
    quote: r.snippet ?? r.extracted_snippet?.original ?? "",
    rating: r.rating,
    time: Math.floor(new Date(r.iso_date).getTime() / 1000),
    source: "google" as const,
    status: "pending" as ReviewStatus,
    email: null,
    createdAt: Math.floor(Date.now() / 1000),
  };
}
