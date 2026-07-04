import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "soltip.db"));
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    handle       TEXT PRIMARY KEY,
    wallet       TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    bio          TEXT,
    avatar_url   TEXT,
    created_at   INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { schema };
