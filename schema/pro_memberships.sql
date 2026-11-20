-- SmartTools Pro: D1 > Console üzerinden yalnızca bir kez çalıştırın.
-- Kodlar sunucu tarafında SHA-256 özeti olarak saklanır; gerçek ödeme doğrulanmadan kayıt eklenmemelidir.
CREATE TABLE IF NOT EXISTS pro_access (
  code_hash TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT,
  session_hash TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pro_access_session ON pro_access(session_hash);
