-- Diário de Obra: users, obras, RDOs and photos (Cloudflare D1 / SQLite).

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('coordenador', 'engenheiro', 'cliente')),
  password_hash TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Which obras a non-coordinator user can access.
CREATE TABLE user_projects (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_projects_updated ON projects(updated_at);

CREATE TABLE logs (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  data              TEXT NOT NULL,
  client_updated_at TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT,
  deleted_at        TEXT
);
CREATE INDEX idx_logs_updated ON logs(updated_at);
CREATE INDEX idx_logs_project ON logs(project_id);

CREATE TABLE photos (
  id         TEXT PRIMARY KEY,
  log_id     TEXT NOT NULL,
  project_id TEXT NOT NULL,
  data_url   TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_photos_log ON photos(log_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE login_attempts (
  key TEXT NOT NULL,
  at  INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts ON login_attempts(key, at);
