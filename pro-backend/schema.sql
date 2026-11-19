-- Cloudflare D1 için özel Pro erişim kayıtları (GitHub Pages içinde tutulmaz).
CREATE TABLE IF NOT EXISTS licenses (
  code_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  order_reference TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (code_hash) REFERENCES licenses(code_hash)
);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
