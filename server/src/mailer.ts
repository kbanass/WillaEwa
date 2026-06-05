import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, "../data/willa-ewa.db");

function createTransport() {
  if (process.env.NODE_ENV !== "production") {
    return nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
    });
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function isConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function stars(rating: number): string {
  return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}

export async function sendNewReviewNotification(review: {
  author: string;
  content: string;
  rating: number;
  email?: string | null;
}): Promise<void> {
  if (!isConfigured() || !process.env.OWNER_EMAIL) return;

  try {
    await createTransport().sendMail({
      from: `"Willa Ewa" <${process.env.GMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      subject: `Nowa opinia – ${review.author}`,
      html: `
        <p>Na stronie pojawiła się nowa opinia oczekująca na akceptację.</p>
        <table style="border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Autor</td><td><b>${review.author}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Ocena</td><td>${stars(review.rating)} (${review.rating}/5)</td></tr>
          ${review.email ? `<tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td>${review.email}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Treść</td><td style="max-width:480px">${review.content}</td></tr>
        </table>
        ${process.env.DOMAIN_NAME ? `
        <p style="margin-top:24px">
          <a href="https://${process.env.DOMAIN_NAME}/panel" style="background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">
            Przejdź do panelu
          </a>
        </p>` : ""}
      `,
    });
    logger.info("[mailer] New review notification sent");
  } catch (error) {
    logger.error(`[mailer] Failed to send review notification: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function sendDatabaseBackup(): Promise<void> {
  if (!isConfigured() || !process.env.BACKUP_EMAIL) return;

  const dbPath = process.env.DB_PATH ?? DEFAULT_DB_PATH;
  if (!dbPath || !fs.existsSync(dbPath)) {
    logger.warn("[mailer] Database backup skipped: file not found");
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `willa-ewa-backup-${date}.db`;

  try {
    await createTransport().sendMail({
      from: `"Willa Ewa" <${process.env.GMAIL_USER}>`,
      to: process.env.BACKUP_EMAIL,
      subject: `Backup bazy danych – ${date}`,
      text: `Cotygodniowy backup bazy danych Willa Ewa (${date}).`,
      attachments: [
        {
          filename,
          content: fs.readFileSync(dbPath),
        },
      ],
    });
    logger.info("[mailer] Database backup sent");
  } catch (error) {
    logger.error(`[mailer] Failed to send database backup: ${error instanceof Error ? error.message : String(error)}`);
  }
}
