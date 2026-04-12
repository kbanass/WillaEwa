import bcrypt from "bcrypt";
import { db } from "../db.js";

const password = process.argv[2];

if (!password) {
  console.error("Enter password: npx tsx seedAdmin.ts <password>");
  process.exit(1);
}

if (!db) {
  console.error("DB is not initialized");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

db.prepare(
  `
  INSERT INTO admin (id, password) VALUES (1, ?)
  ON CONFLICT(id) DO UPDATE SET password = ?
`,
).run(hash, hash);

console.log("Admin password set.");
