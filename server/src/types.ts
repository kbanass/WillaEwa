export const Statuses = ["pending", "accepted", "deleted"] as const;

export type ReviewStatus = (typeof Statuses)[number];

export interface Review {
  id: number;
  author: string;
  quote: string;
  rating: number;
  time: number;
  source: string;
  status: ReviewStatus;
  email: string | null;
  createdAt: number;
}
export interface ReviewTemplateData extends Review {
  initials: string;
  date: string;
}
