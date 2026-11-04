CREATE TABLE platform_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO platform_metadata (key, value) VALUES ('schema_version', '1');
