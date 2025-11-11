export const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_workouts INTEGER DEFAULT 0,
    total_exercises INTEGER DEFAULT 0,
    total_sets INTEGER DEFAULT 0,
    tons_lifted REAL DEFAULT 0.0,
    longest_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    settings TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1
  );
`;

export const createUserSessionsTable = `
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_date DATE DEFAULT CURRENT_DATE,
    workout_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );
`;