import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import logger from "./logger.js";
import { fileURLToPath } from "url";
import type { NewReview, Review, StatusChange } from "../../shared/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "../data/willa-ewa.db");

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

// Migracja: rating INTEGER → REAL (wsparcie dla połówek gwiazdek)
const ratingColType = (
  db.prepare("PRAGMA table_info(reviews)").all() as Array<{ name: string; type: string }>
).find((col) => col.name === "rating")?.type;

if (ratingColType === "INTEGER") {
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE reviews_migrated (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      googleReviewId  TEXT,
      author          TEXT    NOT NULL,
      quote           TEXT    NOT NULL,
      rating          REAL    NOT NULL CHECK (rating BETWEEN 0.5 AND 5),
      time            INTEGER NOT NULL,
      source          TEXT    NOT NULL DEFAULT 'page' CHECK (source IN ('google', 'page')),
      status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'deleted')),
      email           TEXT,
      createdAt       INTEGER NOT NULL DEFAULT (unixepoch())
    );
    INSERT INTO reviews_migrated SELECT * FROM reviews;
    DROP TABLE reviews;
    ALTER TABLE reviews_migrated RENAME TO reviews;
    COMMIT;
  `);
  logger.info("[db] Migration: rating INTEGER → REAL");
}

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
  getAllReviews: db.prepare("SELECT * FROM reviews"),
  getPublicReviews: db.prepare(
    "SELECT * FROM reviews WHERE status = 'accepted'",
  ),
  changeReviewStatus: db.prepare(`UPDATE reviews SET status = ? WHERE id = ?`),
};

export function googleReviewExists(googleReviewId: string): boolean {
  return stmts.googleReviewExists.get(googleReviewId) === 1;
}

export function insertReview(review: NewReview): number {
  if (review.quote === "") review.quote = "Pusta opinia";
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

export function changeReviewsStatuses(changes: StatusChange[]) {
  const updateMany = db.transaction((changes: StatusChange[]) => {
    for (const change of changes) {
      stmts.changeReviewStatus.run(change.status, change.id);
    }
  });

  updateMany(changes);
}
