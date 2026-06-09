export const Statuses = ["pending", "accepted", "deleted"] as const;
export type ReviewStatus = (typeof Statuses)[number];

interface BaseReview {
  author: string;
  quote: string;
  rating: number;
  time: number;
  status: ReviewStatus;
  email: string | null;
  createdAt: number;
}

export interface GoogleReview extends BaseReview {
  source: "google";
  googleReviewId: string;
}

export interface SiteReview extends BaseReview {
  source: "page";
  googleReviewId: null;
}

export type ReviewTemplateData = Review & {
  initials: string;
  date: string;
};

export type StatusChange = Pick<Review, "id" | "status">;

export type NewReview = GoogleReview | SiteReview;
export type Review = NewReview & { id: number };
