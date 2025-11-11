export const CREATE_FAVORITES_TABLE = `
  CREATE TABLE IF NOT EXISTS exercise_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) NOT NULL,
    exercise_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    UNIQUE(user_id, exercise_id)
  );
`;