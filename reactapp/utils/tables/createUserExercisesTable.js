export const CREATE_USER_EXERCISES_TABLE = `
  CREATE TABLE IF NOT EXISTS user_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) NOT NULL,
    exercise_id INTEGER NOT NULL,
    workout_session_id INTEGER,
    sets_completed INTEGER NOT NULL,
    weight_per_set TEXT, -- JSON array of weights for each set
    difficulty_per_set TEXT, -- JSON array of difficulty ratings (1-10) for each set
    reps_per_set TEXT, -- JSON array of reps for each set
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_user_exercises_user_id ON user_exercises(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_exercises_exercise_id ON user_exercises(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_user_exercises_completed_at ON user_exercises(completed_at);
`;