import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// These two lines recreate __dirname, which isn't available in ES modules by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Opens the database file, or creates it if it doesn't exist yet
const db = new Database(join(__dirname, 'language-reader.db'));

// SQLite doesn't enforce foreign keys by default — this turns that on
db.pragma('foreign_keys = ON');

// Read the schema file and run it — creates tables if they don't exist yet
const schema = readFileSync(join(__dirname, '../../docs/schema.sql'), 'utf8');
db.exec(schema);

// Migrations for columns added after initial release
try {
  db.exec(`ALTER TABLE users ADD COLUMN lookup_service TEXT NOT NULL DEFAULT 'mymemory'`);
} catch {
  // Column already exists — safe to ignore
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN lesson_layout TEXT NOT NULL DEFAULT 'stack'`);
} catch {
  // Column already exists — safe to ignore
}
try {
  db.exec(`ALTER TABLE lessons ADD COLUMN last_visited_at TEXT`);
} catch {
  // Column already exists — safe to ignore
}
try {
  db.exec(`ALTER TABLE lessons ADD COLUMN thumbnail_url TEXT`);
} catch {
  // Column already exists — safe to ignore
}

export default db;
