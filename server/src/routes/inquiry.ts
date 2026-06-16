import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import logger from "../logger.js";
import { sendInquiryNotification } from "../mailer.js";
import { sendInquiryNotificationTelegram } from "../telegramTransport.js";

const router = Router();

const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Zbyt wiele zapytań. Spróbuj ponownie za godzinę." },
});

router.post("/", inquiryLimiter, (req: Request, res: Response) => {
  const { name, email, phone, dateFrom, dateTo, adults, childrenAges, website } = req.body;

  if (website && website.length > 0) {
    res.status(200).json({ success: true });
    logger.alert("[inquiry][POST] Honeypot detected, request denied");
    return;
  }

  const nameStr = typeof name === "string" ? name.trim() : "";
  if (!nameStr || nameStr.length < 2 || nameStr.length > 100) {
    res.status(400).json({ error: "Podaj imię i nazwisko" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || email.length > 254 || !emailRegex.test(email)) {
    res.status(400).json({ error: "Podaj prawidłowy adres e-mail" });
    return;
  }

  if (!dateFrom || !dateTo || typeof dateFrom !== "string" || typeof dateTo !== "string") {
    res.status(400).json({ error: "Podaj zakres dat" });
    return;
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    res.status(400).json({ error: "Nieprawidłowy format daty" });
    return;
  }
  if (from >= to) {
    res.status(400).json({ error: "Data wyjazdu musi być późniejsza niż data przyjazdu" });
    return;
  }

  const adultsNum = Number(adults);
  if (!Number.isInteger(adultsNum) || adultsNum < 1 || adultsNum > 20) {
    res.status(400).json({ error: "Podaj liczbę dorosłych (min. 1)" });
    return;
  }

  const childrenAgesStr = typeof childrenAges === "string" ? childrenAges.trim() : "";
  if (childrenAgesStr) {
    if (childrenAgesStr.length > 50) {
      res.status(400).json({ error: "Nieprawidłowy format wieku dzieci (np. 8, 10)" });
      return;
    }
    const ages = childrenAgesStr.split(",").map((s: string) => s.trim());
    const allValid = ages.every((a: string) => /^\d+$/.test(a) && Number(a) >= 0 && Number(a) <= 17);
    if (!allValid) {
      res.status(400).json({ error: "Nieprawidłowy format wieku dzieci (np. 8, 10)" });
      return;
    }
  }

  const phoneStr = typeof phone === "string" ? phone.trim() : "";
  if (!phoneStr) {
    res.status(400).json({ error: "Podaj numer telefonu" });
    return;
  }
  if (phoneStr.length > 20 || !/^[\d\s\+\-\(\)]+$/.test(phoneStr)) {
    res.status(400).json({ error: "Podaj prawidłowy numer telefonu" });
    return;
  }

  logger.info(`[inquiry][POST] Inquiry from ${nameStr} <${email}>, ${dateFrom} → ${dateTo}`);

  sendInquiryNotification({ name: nameStr, email, phone: phoneStr, dateFrom, dateTo, adults: adultsNum, childrenAges: childrenAgesStr });
  sendInquiryNotificationTelegram({ name: nameStr, email, phone: phoneStr, dateFrom, dateTo, adults: adultsNum, childrenAges: childrenAgesStr });

  res.status(200).json({ success: true });
});

export default router;
