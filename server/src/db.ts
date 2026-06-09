import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import logger from "./logger.js";
import { fileURLToPath } from "url";
import type { NewReview, Review, StatusChange } from "../../shared/types.js";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data/willa-ewa.db");

export const db: DatabaseType = new Database(DB_PATH);

db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      googleReviewId    TEXT,
      author              TEXT    NOT NULL,
      quote               TEXT    NOT NULL,
      rating              REAL    NOT NULL CHECK (rating BETWEEN 0.5 AND 5),
      time                INTEGER NOT NULL,
      source              TEXT    NOT NULL DEFAULT 'page' CHECK (source IN ('google', 'page')),
      status              TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'deleted')),
      email               TEXT,
      createdAt          INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS admin (
      id          INTEGER PRIMARY KEY,
      password    TEXT NOT NULL
    );
  `);


logger.info("[db] DB has been initialized");

const stmts = {
  googleReviewExists: db
    .prepare("SELECT EXISTS(SELECT 1 FROM reviews WHERE googleReviewId = ?)")
    .pluck(),
  insertReview: db.prepare(`
    INSERT INTO reviews (googleReviewId, author, quote, rating, time, source, status, email, createdAt)
    VALUES (@googleReviewId, @author, @quote, @rating, @time, @source, @status, @email, @createdAt)
  `),
  getReviewById: db.prepare("SELECT * FROM reviews WHERE id = ?"),
  getAllReviews: db.prepare("SELECT * FROM reviews ORDER BY time DESC"),
  getPublicReviews: db.prepare(
    "SELECT * FROM reviews WHERE status = 'accepted' ORDER BY time DESC",
  ),
  changeReviewStatus: db.prepare(`UPDATE reviews SET status = ? WHERE id = ?`),
  deletePageReview: db.prepare(`DELETE FROM reviews WHERE id = ? AND source = 'page'`),
};

export function googleReviewExists(googleReviewId: string): boolean {
  return stmts.googleReviewExists.get(googleReviewId) === 1;
}

export function insertReview(review: NewReview): number {
  return stmts.insertReview.run(review).lastInsertRowid as number;
}

export function getReviewById(id: number): Review | undefined {
  return stmts.getReviewById.get(id) as Review | undefined;
}

export function getAllReviews(): Review[] {
  return stmts.getAllReviews.all() as Review[];
}

export function getPublicReviews(): Review[] {
  return stmts.getPublicReviews.all() as Review[];
}

export function getGoogleAverageRating(): number | null {
  const row = db
    .prepare("SELECT AVG(rating) as avg FROM reviews WHERE source = 'google'")
    .get() as { avg: number | null };
  return row.avg;
}

export function deletePageReview(id: number): number {
  return stmts.deletePageReview.run(id).changes as number;
}

export function changeReviewsStatuses(changes: StatusChange[]) {
  const updateMany = db.transaction((changes: StatusChange[]) => {
    for (const change of changes) {
      stmts.changeReviewStatus.run(change.status, change.id);
    }
  });

  updateMany(changes);
}
