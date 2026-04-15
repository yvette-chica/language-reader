import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// These two lines recreate __dirname, which isn't available in ES modules by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Opens the database file, or creates it if it doesn't exist yet
const db = new Database(join(__dirname, 'language-reader.db'));

// SQLite doesn't enforce foreign keys by default — this turns that on
db.pragma('foreign_keys = ON');

export default db;
