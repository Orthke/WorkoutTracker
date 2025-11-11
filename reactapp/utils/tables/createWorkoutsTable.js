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
    VALUES ('Push Power', 3, 32, 'default', 1, 'chest, arms');
    -- Get the workout ID for Push Power
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 1 FROM workouts w, exercises e WHERE w.name = 'Push Power' AND e.name = 'Incline Dumbbell Bench';
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 2 FROM workouts w, exercises e WHERE w.name = 'Push Power' AND e.name = 'Flat Barbell Bench';
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 3 FROM workouts w, exercises e WHERE w.name = 'Push Power' AND e.name = 'Tricep Extension';

    -- Insert Workout 2: Leg Day Builder
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Leg Day Builder', 3, 30, 'default', 2, 'legs');
    -- Get the workout ID for Leg Day Builder
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 1 FROM workouts w, exercises e WHERE w.name = 'Leg Day Builder' AND e.name = 'Front Squat';
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 2 FROM workouts w, exercises e WHERE w.name = 'Leg Day Builder' AND e.name = 'Leg Press';
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 3 FROM workouts w, exercises e WHERE w.name = 'Leg Day Builder' AND e.name = 'Calf Raise';

    -- Insert Workout 3: Back and Biceps
    INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group)
    VALUES ('Back and Biceps', 3, 28, 'default', 3, 'back, arms');
    -- Get the workout ID for Back and Biceps
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 1 FROM workouts w, exercises e WHERE w.name = 'Back and Biceps' AND e.name = 'Pullup';
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 2 FROM workouts w, exercises e WHERE w.name = 'Back and Biceps' AND e.name = 'Seated Row';
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    SELECT w.id, e.id, 3 FROM workouts w, exercises e WHERE w.name = 'Back and Biceps' AND e.name = 'Bicep Curl';
`