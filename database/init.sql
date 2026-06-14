-- SQLite schema for Xiah's Baking AI recipes database

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  country TEXT,
  category TEXT,
  prep_time TEXT,
  bake_time TEXT,
  difficulty TEXT,
  ingredients TEXT,
  instructions TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
