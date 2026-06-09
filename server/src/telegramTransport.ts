import TransportStream from "winston-transport";
import axios from "axios";
import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs/app.log");

function isConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function send(text: string): Promise<void> {
  if (!isConfigured()) return;
  const maxLen = 4000;
  try {
    for (let i = 0; i < text.length; i += maxLen) {
      await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: text.slice(i, i + maxLen),
          parse_mode: "HTML",
        },
      );
    }
    console.log("[telegram] Message sent");
  } catch (error) {
    console.error(
      `[telegram] Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export class TelegramTransport extends TransportStream {
  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit("logged", info));

    if (["error", "warn"].includes(info.level)) {
      const emoji = info.level === "error" ? "🔴" : "🟡";
      const parts = [
        `${emoji} <b>${info.level.toUpperCase()}</b>`,
        `<code>${info.timestamp}</code>`,
        escapeHtml(String(info.message)),
        info.stack ? `<pre>${escapeHtml(info.stack)}</pre>` : null,
      ].filter(Boolean);
      send(parts.join("\n")).catch(() => {});
    }

    callback();
  }
}

export async function sendNewReviewNotificationTelegram(review: {
  author: string;
  content: string;
  rating: number;
  email?: string | null;
}): Promise<void> {
  if (!isConfigured()) return;
  const stars = "★".repeat(Math.round(review.rating)) + "☆".repeat(5 - Math.round(review.rating));
  const parts = [
    `⭐ <b>Nowa opinia</b>`,
    `<b>Autor:</b> ${escapeHtml(review.author)}`,
    `<b>Ocena:</b> ${stars} (${review.rating}/5)`,
    review.email ? `<b>E-mail:</b> ${escapeHtml(review.email)}` : null,
    `<b>Treść:</b> ${escapeHtml(review.content)}`,
  ].filter(Boolean);
  await send(parts.join("\n")).catch(() => {});
}

export async function sendDailySummary(): Promise<void> {
  if (!isConfigured()) {
    console.log("[telegram] Daily summary skipped: not configured");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  let entries: any[] = [];
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf-8");
    entries = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((e) => e?.timestamp?.startsWith(today));
  } catch {
    await send(`📋 <b>Podsumowanie ${today}</b>\nBrak pliku logów.`);
    return;
  }

  if (entries.length === 0) {
    await send(`📋 <b>Podsumowanie ${today}</b>\nBrak logów.`);
    return;
  }

  const byLevel = entries.reduce<Record<string, any[]>>((acc, e) => {
    (acc[e.level] ??= []).push(e);
    return acc;
  }, {});

  const levelEmoji: Record<string, string> = {
    error: "🔴",
    warn: "🟡",
    info: "🟢",
    debug: "⚪",
  };

  const countLine = Object.entries(byLevel)
    .map(([lvl, arr]) => `${levelEmoji[lvl] ?? "•"} ${lvl}: ${arr.length}`)
    .join("  ");

  const lines: string[] = [`📋 <b>Podsumowanie dnia ${today}</b>`, countLine];

  for (const level of ["error", "warn", "info"]) {
    const items = byLevel[level];
    if (!items?.length) continue;
    lines.push(`\n${levelEmoji[level]} <b>${level.toUpperCase()}:</b>`);
    for (const e of items) {
      lines.push(`<code>[${e.timestamp}]</code> ${escapeHtml(String(e.message))}`);
    }
  }

  await send(lines.join("\n"));
}
