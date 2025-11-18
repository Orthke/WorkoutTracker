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
    -- Insert Workout 1: Chest
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Chest', 4, 30, 'system', 1, 'chest');
    
    -- Insert Workout 2: Back
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Back', 4, 28, 'system', 2, 'back');
    
    -- Insert Workout 3: Legs
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Legs', 4, 32, 'system', 3, 'legs');
    
    -- Insert Workout 4: Shoulders
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Shoulders', 4, 27, 'system', 4, 'shoulders');
`;

export const CREATE_WORKOUT_EXERCISE_RELATIONSHIPS = `
    -- Chest exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Chest' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Chest')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Bench Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Chest' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Incline Bench Press' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Chest')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Incline Bench Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Chest' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Cable Fly' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Chest')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Cable Fly');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Chest' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Pushup' LIMIT 1),
        4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Chest')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Pushup');

    -- Back exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Deadlift' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Deadlift');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Pullup' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Pullup');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Barbell Row' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Barbell Row');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Back' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Lat Pulldown' LIMIT 1),
        4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Back')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Lat Pulldown');

    -- Legs exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Legs' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Squat' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Legs')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Legs' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Romanian Deadlift' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Legs')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Romanian Deadlift');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Legs' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Leg Press' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Legs')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Legs' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Calf Raise' LIMIT 1),
        4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Legs')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Calf Raise');

    -- Shoulders exercises
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Shoulders' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Overhead Press' LIMIT 1),
        1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Shoulders')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Overhead Press');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Shoulders' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Lateral Raise' LIMIT 1),
        2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Shoulders')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Lateral Raise');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Shoulders' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Front Raise' LIMIT 1),
        3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Shoulders')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Front Raise');
    
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT 
        (SELECT id FROM workouts WHERE name = 'Shoulders' LIMIT 1),
        (SELECT id FROM exercises WHERE name = 'Face Pull' LIMIT 1),
        4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Shoulders')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Face Pull');
`;