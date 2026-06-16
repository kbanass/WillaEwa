import nodemailer from "nodemailer";
import { Resend } from "resend";
import fs from "fs";
import path from "path";
import logger from "./logger.js";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data/willa-ewa.db");

type Mail = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
};

function isConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

async function sendMail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    logger.info(`[mailer][dev] To: ${mail.to} | Subject: ${mail.subject}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to: mail.to,
    subject: mail.subject,
    ...(mail.html ? { html: mail.html } : { text: mail.text ?? "" }),
    ...(mail.attachments ? { attachments: mail.attachments } : {}),
  });

  if (error) throw new Error(error.message);
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  if (!isConfigured() || !process.env.OWNER_EMAIL) {
    logger.info("[mailer] Review notification skipped: mailer not configured");
    return;
  }

  logger.info(
    `[mailer] Sending review notification for review by "${review.author}"`,
  );

  try {
    await sendMail({
      to: process.env.OWNER_EMAIL,
      subject: `Nowa opinia – ${review.author}`,
      html: `
        <p>Na stronie pojawiła się nowa opinia oczekująca na akceptację.</p>
        <table style="border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Autor</td><td><b>${escapeHtml(review.author)}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Ocena</td><td>${stars(review.rating)} (${review.rating}/5)</td></tr>
          ${review.email ? `<tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td>${escapeHtml(review.email)}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Treść</td><td style="max-width:480px">${escapeHtml(review.content)}</td></tr>
        </table>
        ${
          process.env.DOMAIN_NAME
            ? `
        <p style="margin-top:24px">
          <a href="https://${process.env.DOMAIN_NAME}/panel" style="background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">
            Przejdź do panelu
          </a>
        </p>`
            : ""
        }
      `,
    });
    logger.info("[mailer] New review notification sent");
  } catch (error) {
    logger.error(
      `[mailer] Failed to send review notification: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function sendInquiryNotification(inquiry: {
  name: string;
  email: string;
  phone: string;
  dateFrom: string;
  dateTo: string;
  adults: number;
  childrenAges: string;
}): Promise<void> {
  if (!isConfigured() || !process.env.OWNER_EMAIL) {
    logger.info("[mailer] Inquiry notification skipped: mailer not configured");
    return;
  }

  const from = new Date(inquiry.dateFrom).toLocaleDateString("pl-PL");
  const to = new Date(inquiry.dateTo).toLocaleDateString("pl-PL");
  const nights = Math.round(
    (new Date(inquiry.dateTo).getTime() -
      new Date(inquiry.dateFrom).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const childrenCount = inquiry.childrenAges
    ? inquiry.childrenAges.split(",").length
    : 0;
  const childrenRow = inquiry.childrenAges
    ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Dzieci</td><td>${childrenCount} (wiek: ${escapeHtml(inquiry.childrenAges)})</td></tr>`
    : `<tr><td style="padding:4px 12px 4px 0;color:#666">Dzieci</td><td>brak</td></tr>`;

  logger.info(`[mailer] Sending inquiry notification from ${inquiry.name} <${inquiry.email}>`);

  try {
    await sendMail({
      to: process.env.OWNER_EMAIL,
      subject: `Zapytanie o dostępność – ${escapeHtml(inquiry.name)} (${from} → ${to})`,
      html: `
        <p>Nowe zapytanie o dostępność terminu.</p>
        <table style="border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Imię i nazwisko</td><td><b>${escapeHtml(inquiry.name)}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td>${escapeHtml(inquiry.email)}</td></tr>
          ${inquiry.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Telefon</td><td>${escapeHtml(inquiry.phone)}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#666">Przyjazd</td><td>${from}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Wyjazd</td><td>${to}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Liczba nocy</td><td>${nights}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Dorośli</td><td>${inquiry.adults}</td></tr>
          ${childrenRow}
        </table>
        <p style="margin-top:24px;color:#666;font-size:13px">
          Adres email nadawcy: <a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a>
        </p>
      `,
    });
    logger.info("[mailer] Inquiry notification sent");
  } catch (error) {
    logger.error(
      `[mailer] Failed to send inquiry notification: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function sendDatabaseBackup(): Promise<void> {
  if (!isConfigured() || !process.env.BACKUP_EMAIL) {
    logger.info("[mailer] Database backup skipped: mailer not configured");
    return;
  }

  const dbPath = process.env.DB_PATH ?? DEFAULT_DB_PATH;
  if (!dbPath || !fs.existsSync(dbPath)) {
    logger.warn("[mailer] Database backup skipped: file not found");
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `willa-ewa-backup-${date}.db`;

  logger.info(`[mailer] Sending database backup (${filename})`);

  try {
    await sendMail({
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
    logger.error(
      `[mailer] Failed to send database backup: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
