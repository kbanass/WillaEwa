import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import logger from "./logger.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "../data/willa-ewa.db");

export const db: DatabaseType = new Database(DB_PATH);

export function initDB(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      author      TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      time        INTEGER NOT NULL,
      source      TEXT    NOT NULL DEFAULT 'page' CHECK (source IN ('google', 'strona')),
      status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'deleted')),
      email       TEXT,
      createdAt   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS admin (
      id          INTEGER PRIMARY KEY,
      password    TEXT NOT NULL
    );
  `);

  logger.info("[db] DB has been initialized");
}
