export const CREATE_WORKOUTS_TABLE = `
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    num_exercises INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    "user" VARCHAR(50) NOT NULL,
    "order" INTEGER,
    major_group VARCHAR(50) NOT NULL
);
`;

export const CREATE_WORKOUT_EXERCISES_JOIN = `
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    exercise_order INTEGER NOT NULL
);
`;

export const CREATE_DEFAULT_WORKOUTS = `
    -- Insert Workout 1: Push Power
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Push Power', 3, 32, 'system', 1, 'chest, arms');
    
    -- Insert Workout 2: Leg Day Builder
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Leg Day Builder', 3, 30, 'system', 2, 'legs');
    
    -- Insert Workout 3: Back and Biceps
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Back and Biceps', 3, 28, 'system', 3, 'back, arms');
`;

export const CREATE_WORKOUT_EXERCISE_RELATIONSHIPS = `
    -- Push Power exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Push Power' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Incline Bench Press' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Power')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Incline Bench Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Push Power' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Power')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Bench Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Push Power' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Tricep Extension' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Power')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Tricep Extension');

    -- Leg Day Builder exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Leg Day Builder' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Front Squat' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day Builder')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Front Squat');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Leg Day Builder' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Leg Press' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day Builder')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Leg Day Builder' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Calf Raise' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day Builder')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Calf Raise');

    -- Back and Biceps exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back and Biceps' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Pullup' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back and Biceps')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Pullup');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back and Biceps' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Seated Cable Row' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back and Biceps')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Seated Cable Row');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back and Biceps' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Bicep Curl' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back and Biceps')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Bicep Curl');
`;