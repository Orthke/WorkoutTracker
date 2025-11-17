export const CREATE_USER_MEASUREMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS user_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  weight_lbs REAL,
  body_fat_percentage REAL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_measurements_user_id ON user_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_measurements_recorded_at ON user_measurements(recorded_at);
`;