export const CREATE_WORKOUTS_TABLE = `
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    num_exercises INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    "user" VARCHAR(50) NOT NULL,
    "order" INTEGER,
    major_group VARCHAR(50) NOT NULL,
    archived INTEGER DEFAULT 0
);
`;

export const CREATE_WORKOUT_EXERCISES_JOIN = `
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    exercise_order INTEGER NOT NULL,
    alternates TEXT DEFAULT NULL
);
`;

export const CREATE_DEFAULT_WORKOUTS = `
    -- Workout 1: Push Day (Chest, Shoulders, Triceps)
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Push Day (Chest, Shoulders, Triceps)', 6, 45, 'system', 1, 'push');

    -- Workout 2: Pull Day (Back, Biceps, Rear Delts)
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Pull Day (Back, Biceps, Rear Delts)', 6, 45, 'system', 2, 'pull');

    -- Workout 3: Leg Day (Quads, Glutes, Hamstrings, Calves)
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Leg Day (Quads, Glutes, Hamstrings, Calves)', 6, 50, 'system', 3, 'legs');

    -- Workout 4: Push Day B (Incline Focus & Volume)
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Push Day B (Incline Focus & Volume)', 6, 45, 'system', 4, 'push');

    -- Workout 5: Pull Day B (Width & Thickness Focus)
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Pull Day B (Width & Thickness Focus)', 6, 45, 'system', 5, 'pull');

    -- Workout 6: Leg Day B (Posterior Chain & Power)
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Leg Day B (Posterior Chain & Power)', 6, 50, 'system', 6, 'legs');
`;

export const CREATE_WORKOUT_EXERCISE_RELATIONSHIPS = `

    ------------------------------------------------------------------
    -- Workout 1: Push Day (Chest, Shoulders, Triceps)
    ------------------------------------------------------------------
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)'), 
           (SELECT id FROM exercises WHERE name = 'Bench Press'), 1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Bench Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)'), 
           (SELECT id FROM exercises WHERE name = 'Military Press'), 2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Military Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)'), 
           (SELECT id FROM exercises WHERE name = 'Dumbbell Fly'), 3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Dumbbell Fly');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)'), 
           (SELECT id FROM exercises WHERE name = 'Lateral Raise'), 4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Lateral Raise');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)'), 
           (SELECT id FROM exercises WHERE name = 'Tricep Pulldown'), 5
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Tricep Pulldown');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)'), 
           (SELECT id FROM exercises WHERE name = 'Close Grip Bench Press'), 6
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day (Chest, Shoulders, Triceps)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Close Grip Bench Press');


    ------------------------------------------------------------------
    -- Workout 2: Pull Day (Back, Biceps, Rear Delts)
    ------------------------------------------------------------------
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)'), 
           (SELECT id FROM exercises WHERE name = 'Pullup'), 1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Pullup');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)'), 
           (SELECT id FROM exercises WHERE name = 'Barbell Row'), 2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Barbell Row');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)'), 
           (SELECT id FROM exercises WHERE name = 'Seated Cable Row'), 3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Seated Cable Row');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)'), 
           (SELECT id FROM exercises WHERE name = 'Face Pull'), 4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Face Pull');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)'), 
           (SELECT id FROM exercises WHERE name = 'Barbell Curl'), 5
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Barbell Curl');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)'), 
           (SELECT id FROM exercises WHERE name = 'Hammer Curl'), 6
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day (Back, Biceps, Rear Delts)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Hammer Curl');


    ------------------------------------------------------------------
    -- Workout 3: Leg Day (Quads, Glutes, Hamstrings, Calves)
    ------------------------------------------------------------------
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)'), 
           (SELECT id FROM exercises WHERE name = 'Squat'), 1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)'), 
           (SELECT id FROM exercises WHERE name = 'Romanian Deadlift'), 2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Romanian Deadlift');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)'), 
           (SELECT id FROM exercises WHERE name = 'Leg Press'), 3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)'), 
           (SELECT id FROM exercises WHERE name = 'Leg Curl'), 4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Curl');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)'), 
           (SELECT id FROM exercises WHERE name = 'Bulgarian Split Squat'), 5
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Bulgarian Split Squat');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)'), 
           (SELECT id FROM exercises WHERE name = 'Standing Calf Raise'), 6
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day (Quads, Glutes, Hamstrings, Calves)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Standing Calf Raise');


    ------------------------------------------------------------------
    -- Workout 4: Push Day B (Incline Focus & Volume)
    ------------------------------------------------------------------
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)'), 
           (SELECT id FROM exercises WHERE name = 'Incline Dumbbell Press'), 1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Incline Dumbbell Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)'), 
           (SELECT id FROM exercises WHERE name = 'Dumbbell Shoulder Press'), 2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Dumbbell Shoulder Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)'), 
           (SELECT id FROM exercises WHERE name = 'Decline Dumbbell Press'), 3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Decline Dumbbell Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)'), 
           (SELECT id FROM exercises WHERE name = 'Arnold Press'), 4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Arnold Press');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)'), 
           (SELECT id FROM exercises WHERE name = 'Tricep Extension'), 5
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Tricep Extension');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)'), 
           (SELECT id FROM exercises WHERE name = 'Weighted Dip'), 6
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Push Day B (Incline Focus & Volume)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Weighted Dip');


    ------------------------------------------------------------------
    -- Workout 5: Pull Day B (Width & Thickness Focus)
    ------------------------------------------------------------------
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)'), 
           (SELECT id FROM exercises WHERE name = 'Wide Grip Pullup'), 1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Wide Grip Pullup');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)'), 
           (SELECT id FROM exercises WHERE name = 'T-Bar Row'), 2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'T-Bar Row');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)'), 
           (SELECT id FROM exercises WHERE name = 'Lat Pulldown'), 3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Lat Pulldown');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)'), 
           (SELECT id FROM exercises WHERE name = 'Reverse Fly'), 4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Reverse Fly');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)'), 
           (SELECT id FROM exercises WHERE name = 'Preacher Curl'), 5
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Preacher Curl');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)'), 
           (SELECT id FROM exercises WHERE name = 'Shrug'), 6
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Pull Day B (Width & Thickness Focus)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Shrug');


    ------------------------------------------------------------------
    -- Workout 6: Leg Day B (Posterior Chain & Power)
    ------------------------------------------------------------------
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)'), 
           (SELECT id FROM exercises WHERE name = 'Deadlift'), 1
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Deadlift');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)'), 
           (SELECT id FROM exercises WHERE name = 'Hip Thrust'), 2
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Hip Thrust');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)'), 
           (SELECT id FROM exercises WHERE name = 'Jump Squat'), 3
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Jump Squat');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)'), 
           (SELECT id FROM exercises WHERE name = 'Walking Lunge'), 4
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Walking Lunge');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)'), 
           (SELECT id FROM exercises WHERE name = 'Leg Extension'), 5
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Extension');

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT (SELECT id FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)'), 
           (SELECT id FROM exercises WHERE name = 'Seated Calf Raise'), 6
    WHERE EXISTS (SELECT 1 FROM workouts WHERE name = 'Leg Day B (Posterior Chain & Power)')
      AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Seated Calf Raise');

`;
