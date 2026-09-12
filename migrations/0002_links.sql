CREATE TABLE IF NOT EXISTS device_links (
  code TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS public_links (
  public_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL
);
