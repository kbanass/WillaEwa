import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import "dotenv/config";

import { initDB } from "./db.js";
import { startCron, getGoogleReviews } from "./cron.js";
import opinieRouter from "./routes/reviews.js";
import adminRouter from "./routes/admin.js";
import logger from "./logger.js";
import { getReviews } from "./test.js";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../../client")));

app.get("/admin", (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    res.redirect("/login");
    return;
  }

  res.sendFile(path.join(__dirname, "../../client/admin/index.html"));
});

app.use("/api/opinie", opinieRouter);
app.use("/api/admin", adminRouter);

// initDB();
// startCron();
// getGoogleReviews();

app.listen(PORT, () => {
  logger.info(`[server] Server started at port: ${PORT}`);
});

getReviews();
