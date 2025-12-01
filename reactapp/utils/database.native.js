// Native-specific database implementation using SQLite
import { openDatabaseSync } from 'expo-sqlite';
import { CREATE_EXERCISES_TABLE, INITIAL_EXERCISES } from './tables/createExercisesTable';
import { CREATE_FAVORITES_TABLE } from './tables/createFavoritesTable';
import { CREATE_USER_EXERCISES_TABLE } from './tables/createUserExercisesTable';
import { CREATE_USER_MEASUREMENTS_TABLE } from './tables/createUserMeasurementsTable';
import { createUserSessionsTable, createUsersTable } from './tables/createUsersTable';
import { CREATE_DEFAULT_WORKOUTS, CREATE_WORKOUTS_TABLE, CREATE_WORKOUT_EXERCISES_JOIN, CREATE_WORKOUT_EXERCISE_RELATIONSHIPS } from './tables/createWorkoutsTable';

let db = null;

const CREATE_USER_WORKOUTS_TABLE = `
CREATE TABLE IF NOT EXISTS user_workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  workout_id INTEGER,
  workout_name TEXT,
  duration INTEGER,
  comments TEXT,
  session_guid TEXT,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_workouts_user_id ON user_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workouts_session_guid ON user_workouts(session_guid);
`;

const CREATE_ACTIVE_WORKOUT_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS active_workout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  workout_id INTEGER NOT NULL,
  session_guid TEXT,
  exercise_states TEXT,
  temp_exercises TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, workout_id)
);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_workout_sessions(user_id);
`;

// Initialize database tables
export const initDatabase = async () => {
  try {
    if (!db) {
      db = openDatabaseSync('workoutTracker.db');
      console.log('Database opened successfully');
    }

    // Check if we need to force schema update (for missing critical columns)
    try {
      // Check if users table has the required columns
      const usersInfo = db.getAllSync('PRAGMA table_info(users)');
      const hasActiveWorkout = usersInfo.some(col => col.name === 'active_workout');
      
      // Check if user_workouts table has session_guid column
      let hasSessionGuid = false;
      try {
        const userWorkoutsInfo = db.getAllSync('PRAGMA table_info(user_workouts)');
        hasSessionGuid = userWorkoutsInfo.some(col => col.name === 'session_guid');
      } catch (_error) {
        // Table might not exist yet
      }
      
      if (!hasActiveWorkout || !hasSessionGuid) {
        console.log('Missing critical columns detected (active_workout:', !hasActiveWorkout, ', session_guid:', !hasSessionGuid, '), forcing database recreation...');
        
        // Drop and recreate all tables to ensure proper schema
        const tables = ['active_workout_sessions', 'user_workouts', 'user_sessions', 'users', 
                       'workout_exercises', 'workouts', 'user_exercises', 'user_measurements', 'favorites', 'exercises'];
        
        for (const table of tables) {
          try {
            db.execSync(`DROP TABLE IF EXISTS ${table}`);
            console.log(`Dropped table: ${table}`);
          } catch (_error) {
            // Table might not exist, ignore
          }
        }
        
        console.log('Old tables dropped, creating fresh schema...');
      }
    } catch (error) {
      console.log('Schema check failed, proceeding with forced recreation due to API compatibility:', error);
      
      // Force recreation anyway since schema check failed
      const tables = ['active_workout_sessions', 'user_workouts', 'user_sessions', 'users', 
                     'workout_exercises', 'workouts', 'user_exercises', 'user_measurements', 'favorites', 'exercises'];
      
      for (const table of tables) {
        try {
          db.execSync(`DROP TABLE IF EXISTS ${table}`);
          console.log(`Dropped table: ${table}`);
        } catch (_error) {
          // Table might not exist, ignore
        }
      }
      
      console.log('Forced table recreation due to schema check failure...');
    }

    // Create exercises table
    db.execSync(CREATE_EXERCISES_TABLE);
    console.log('Exercises table created successfully');
    
    // Create workouts table
    db.execSync(CREATE_WORKOUTS_TABLE);
    console.log('Workouts table created successfully');
    
    // Create workout_exercises join table
    db.execSync(CREATE_WORKOUT_EXERCISES_JOIN);
    console.log('Workout exercises join table created successfully');
    
    // Create favorites table
    db.execSync(CREATE_FAVORITES_TABLE);
    console.log('Exercise favorites table created successfully');
    
    // Create users table
    db.execSync(createUsersTable);
    console.log('Users table created successfully');
    
    // Create user sessions table
    db.execSync(createUserSessionsTable);
    console.log('User sessions table created successfully');
    
    // Create user exercises table
    db.execSync(CREATE_USER_EXERCISES_TABLE);
    console.log('User exercises table and indexes created successfully');

    // Create user workouts table
    db.execSync(CREATE_USER_WORKOUTS_TABLE);
    console.log('User workouts table created successfully');

    // Create user measurements table
    db.execSync(CREATE_USER_MEASUREMENTS_TABLE);
    console.log('User measurements table created successfully');

    // Create active workout sessions table
    db.execSync(CREATE_ACTIVE_WORKOUT_SESSIONS_TABLE);
    console.log('Active workout sessions table created successfully');
    
    // Upgrade existing users table with new columns if they don't exist
    try {
      db.execSync('ALTER TABLE users ADD COLUMN total_sets INTEGER DEFAULT 0');
      console.log('Added total_sets column to users table');
    } catch (_error) {
      // Column already exists, ignore error
    }
    
    try {
      db.execSync('ALTER TABLE users ADD COLUMN tons_lifted REAL DEFAULT 0.0');
      console.log('Added tons_lifted column to users table');
    } catch (_error) {
      // Column already exists, ignore error
    }

    try {
      db.execSync('ALTER TABLE users ADD COLUMN active_workout INTEGER DEFAULT NULL');
      console.log('Added active_workout column to users table');
    } catch (_error) {
      // Column already exists, ignore error
    }

    // Add session_guid column to user_workouts table if it doesn't exist
    try {
      // First check if the column exists
      const userWorkoutsInfo = db.getAllSync('PRAGMA table_info(user_workouts)');
      const hasSessionGuid = userWorkoutsInfo.some(col => col.name === 'session_guid');
      
      if (!hasSessionGuid) {
        db.execSync('ALTER TABLE user_workouts ADD COLUMN session_guid TEXT');
        console.log('Added session_guid column to user_workouts table');
      }
    } catch (error) {
      console.error('Error adding session_guid to user_workouts:', error);
    }

    try {
      // Check if the column exists in active_workout_sessions
      const activeSessionsInfo = db.getAllSync('PRAGMA table_info(active_workout_sessions)');
      const hasSessionGuid = activeSessionsInfo.some(col => col.name === 'session_guid');
      
      if (!hasSessionGuid) {
        db.execSync('ALTER TABLE active_workout_sessions ADD COLUMN session_guid TEXT');
        console.log('Added session_guid column to active_workout_sessions table');
      }
    } catch (error) {
      console.error('Error adding session_guid to active_workout_sessions:', error);
    }

    try {
      db.execSync('ALTER TABLE users ADD COLUMN total_workout_minutes INTEGER DEFAULT 0');
      console.log('Added total_workout_minutes column to users table');
    } catch (_error) {
      // Column already exists, ignore error
    }
    
    // Add alternates column to workout_exercises table if it doesn't exist
    try {
      db.execSync('ALTER TABLE workout_exercises ADD COLUMN alternates TEXT DEFAULT NULL');
      console.log('Added alternates column to workout_exercises table');
    } catch (_error) {
      // Column already exists, ignore error
    }

    // Upgrade user_exercises table with created_at column if it doesn't exist
    try {
      db.execSync('ALTER TABLE user_exercises ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('Added created_at column to user_exercises table');
    } catch (_error) {
      // Column already exists, ignore error
    }

    // Upgrade exercises table with missing columns if they don't exist
    try {
      db.execSync('ALTER TABLE exercises ADD COLUMN user_id VARCHAR(50) DEFAULT "system"');
      console.log('Added user_id column to exercises table');
    } catch (_error) {
      // Column already exists, ignore error
    }
    
    try {
      db.execSync('ALTER TABLE exercises ADD COLUMN is_custom BOOLEAN DEFAULT FALSE');
      console.log('Added is_custom column to exercises table');
    } catch (_error) {
      // Column already exists, ignore error
    }
    
    try {
      db.execSync('ALTER TABLE exercises ADD COLUMN bodyweight BOOLEAN DEFAULT FALSE');
      console.log('Added bodyweight column to exercises table');
    } catch (_error) {
      // Column already exists, ignore error
    }

    // Ensure legacy placeholder users are not marked as active
    try {
      db.runSync('UPDATE users SET is_active = 0 WHERE username = ?', ['default']);
    } catch (error) {
      console.error('Error deactivating legacy default user:', error);
    }
    
    // Check if exercises table has data, if not insert exercises
    const exerciseResult = db.getFirstSync('SELECT COUNT(*) as count FROM exercises');
    if (exerciseResult.count === 0) {
      try {
        for (const exercise of INITIAL_EXERCISES) {
          db.runSync(`
            INSERT INTO exercises (name, description, major_group, minor_group, base_sets, base_reps, estimated_duration, press_pull, category, bodyweight, user_id, is_custom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            exercise.name || '',
            exercise.description || '',
            exercise.major_group || '',
            exercise.minor_group || null,
            exercise.base_sets || 3,
            exercise.base_reps || 10,
            exercise.estimated_duration || 10,
            exercise.press_pull || null,
            exercise.category || 'strength',
            exercise.bodyweight || false,
            exercise.user_id || 'system',
            exercise.is_custom || false
          ]);
        }
        console.log('Exercises inserted successfully');
      } catch (exerciseError) {
        console.error('Error inserting exercises:', exerciseError);
        throw exerciseError;
      }
    }
    
    // Check if workouts table has data, if not insert sample workouts
    const workoutResult = db.getFirstSync('SELECT COUNT(*) as count FROM workouts');
    if (workoutResult.count === 0) {
      // Execute the default workouts creation script
      db.execSync(CREATE_DEFAULT_WORKOUTS);
      console.log('Sample workouts created successfully');
      
      // Create workout-exercise relationships
      try {
        db.execSync(CREATE_WORKOUT_EXERCISE_RELATIONSHIPS);
        console.log('Workout exercise relationships created successfully');
      } catch (relationshipError) {
        console.error('Error creating workout exercise relationships:', relationshipError);
        // Don't throw here, workouts can still function without default exercises
      }
    }
    
    // Repair any system workouts that might be missing exercise relationships
    try {
      const repairResult = await repairSystemWorkouts();
      if (repairResult.success) {
        console.log('✅ System workout repair check completed:', repairResult.message);
      } else {
        console.error('⚠️ System workout repair failed:', repairResult.error);
      }
    } catch (repairError) {
      console.error('⚠️ Error during system workout repair:', repairError);
    }
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Force recreate system workouts (for repair)
export const forceRecreateSystemWorkouts = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    console.log('🔄 Force recreating system workouts...');
    
    // First ensure database is initialized (this will recreate tables if needed)
    await initDatabase();
    
    // Delete existing system workouts and their relationships
    try {
      db.runSync('DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE user = "system")');
      db.runSync('DELETE FROM workouts WHERE user = "system"');
      console.log('  - Deleted existing system workouts');
    } catch (_deleteError) {
      console.log('  - Tables were empty or recreated, skipping deletion');
    }
    
    // Recreate system workouts
    db.execSync(CREATE_DEFAULT_WORKOUTS);
    console.log('  - Inserted fresh system workouts');
    
    // Recreate workout-exercise relationships
    try {
      db.execSync(CREATE_WORKOUT_EXERCISE_RELATIONSHIPS);
      console.log('  - Created exercise relationships');
    } catch (relationshipError) {
      console.error('  - Error creating workout exercise relationships:', relationshipError);
      // Continue anyway, workouts can exist without relationships
    }
    
    console.log('✅ System workouts recreated successfully');
    return { success: true, message: 'System workouts recreated successfully' };
  } catch (error) {
    console.error('❌ Error recreating system workouts:', error);
    return { success: false, error: error.message };
  }
};

// Repair system workouts that exist but have no exercise relationships
export const repairSystemWorkouts = async () => {
  try {
    if (!db) throw new Error('Database not initialized');

    //console.log('🔧 Checking system workouts for missing exercises...');

    const systemWorkouts = db.getAllSync('SELECT * FROM workouts WHERE user = "system"');

    if (systemWorkouts.length === 0) {
      console.log('  - No system workouts found, creating them...');
      db.execSync(CREATE_DEFAULT_WORKOUTS);
      console.log('✅ System workouts created');
    }

    const defaultWorkoutExercises = {
      'Push Day (Chest, Shoulders, Triceps)': [
        { name: 'Bench Press', order: 1 },
        { name: 'Military Press', order: 2 },
        { name: 'Dumbbell Fly', order: 3 },
        { name: 'Lateral Raise', order: 4 },
        { name: 'Tricep Pulldown', order: 5 },
        { name: 'Close Grip Bench Press', order: 6 }
      ],
      'Pull Day (Back, Biceps, Rear Delts)': [
        { name: 'Pullup', order: 1 },
        { name: 'Barbell Row', order: 2 },
        { name: 'Seated Cable Row', order: 3 },
        { name: 'Face Pull', order: 4 },
        { name: 'Barbell Curl', order: 5 },
        { name: 'Hammer Curl', order: 6 }
      ],
      'Leg Day (Quads, Glutes, Hamstrings, Calves)': [
        { name: 'Squat', order: 1 },
        { name: 'Romanian Deadlift', order: 2 },
        { name: 'Leg Press', order: 3 },
        { name: 'Leg Curl', order: 4 },
        { name: 'Bulgarian Split Squat', order: 5 },
        { name: 'Standing Calf Raise', order: 6 }
      ],
      'Push Day B (Incline Focus & Volume)': [
        { name: 'Incline Dumbbell Press', order: 1 },
        { name: 'Dumbbell Shoulder Press', order: 2 },
        { name: 'Decline Dumbbell Press', order: 3 },
        { name: 'Arnold Press', order: 4 },
        { name: 'Tricep Extension', order: 5 },
        { name: 'Weighted Dip', order: 6 }
      ],
      'Pull Day B (Width & Thickness Focus)': [
        { name: 'Wide Grip Pullup', order: 1 },
        { name: 'T-Bar Row', order: 2 },
        { name: 'Lat Pulldown', order: 3 },
        { name: 'Reverse Fly', order: 4 },
        { name: 'Preacher Curl', order: 5 },
        { name: 'Shrug', order: 6 }
      ],
      'Leg Day B (Posterior Chain & Power)': [
        { name: 'Deadlift', order: 1 },
        { name: 'Hip Thrust', order: 2 },
        { name: 'Jump Squat', order: 3 },
        { name: 'Walking Lunge', order: 4 },
        { name: 'Leg Extension', order: 5 },
        { name: 'Seated Calf Raise', order: 6 }
      ]
    };

    let insertedLinks = 0;
    const missingExercises = [];

    for (const [workoutName, exercises] of Object.entries(defaultWorkoutExercises)) {
      const workoutRow = db.getFirstSync(
        'SELECT id FROM workouts WHERE name = ? AND user = "system" LIMIT 1',
        [workoutName]
      );

      if (!workoutRow) {
        console.warn(`⚠️ Workout "${workoutName}" is missing and cannot be repaired.`);
        continue;
      }

      exercises.forEach(({ name, order }) => {
        const exerciseRow = db.getFirstSync(
          'SELECT id FROM exercises WHERE name = ? LIMIT 1',
          [name]
        );

        if (!exerciseRow) {
          missingExercises.push(name);
          return;
        }

        const existingLink = db.getFirstSync(
          'SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ? LIMIT 1',
          [workoutRow.id, exerciseRow.id]
        );

        if (!existingLink) {
          db.runSync(
            'INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order) VALUES (?, ?, ?)',
            [workoutRow.id, exerciseRow.id, order]
          );
          insertedLinks += 1;
          console.log(`  - Added missing exercise "${name}" to workout "${workoutName}"`);
        }
      });

      const expectedCount = exercises.length;
      const currentCount = db.getFirstSync(
        'SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?',
        [workoutRow.id]
      );

      if (currentCount.count !== expectedCount) {
        db.runSync(
          'UPDATE workouts SET num_exercises = ? WHERE id = ?',
          [currentCount.count, workoutRow.id]
        );
      }
    }

    if (missingExercises.length > 0) {
      const uniqueMissing = Array.from(new Set(missingExercises));
      console.warn('⚠️ Missing expected system exercises:', uniqueMissing.join(', '));
    }

    if (insertedLinks > 0) {
      return { success: true, message: `System workouts repaired: ${insertedLinks} links added` };
    }

    console.log('✅ System workouts already have proper exercise relationships');
    return { success: true, message: 'System workouts are already properly configured' };
  } catch (error) {
    console.error('❌ Error repairing system workouts:', error);
    return { success: false, error: error.message };
  }
};

// Get all workouts from database
export const getWorkoutsFromDB = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // First try with archived column, fallback without it if column doesn't exist
    try {
      const result = db.getAllSync('SELECT * FROM workouts WHERE archived = 0 OR archived IS NULL ORDER BY "order" ASC');
      return result;
    } catch (_columnError) {
      // Archived column might not exist yet, fall back to basic query
      console.log('Archived column not found, using basic query');
      const result = db.getAllSync('SELECT * FROM workouts ORDER BY "order" ASC');
      return result;
    }
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }
};

// Get archived workouts
export const getArchivedWorkoutsFromDB = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getAllSync('SELECT * FROM workouts WHERE archived = 1 ORDER BY "order" ASC');
    return result;
  } catch (error) {
    console.error('Error fetching archived workouts:', error);
    return [];
  }
};

// Update workout order
export const updateWorkoutOrder = async (workoutId, newOrder) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        if (!db) throw new Error('Database not initialized');
        
        db.runSync('UPDATE workouts SET "order" = ? WHERE id = ?', [newOrder, workoutId]);
        resolve();
      } catch (error) {
        console.error('Error updating workout order:', error);
        reject(error);
      }
    }, 0);
  });
};

// Archive workout
export const archiveWorkout = async (workoutId) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        if (!db) throw new Error('Database not initialized');
        
        db.runSync('UPDATE workouts SET archived = 1 WHERE id = ?', [workoutId]);
        resolve();
      } catch (error) {
        console.error('Error archiving workout:', error);
        reject(error);
      }
    }, 0);
  });
};

// Restore archived workout
export const restoreWorkout = async (workoutId) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        if (!db) throw new Error('Database not initialized');
        
        db.runSync('UPDATE workouts SET archived = 0 WHERE id = ?', [workoutId]);
        resolve();
      } catch (error) {
        console.error('Error restoring workout:', error);
        reject(error);
      }
    }, 0);
  });
};

// Move workout to different date
export const moveWorkoutToDate = async (workoutRecordId, newDate) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        if (!db) throw new Error('Database not initialized');
        
        // Update the completed_at timestamp to the new date
        db.runSync('UPDATE user_workouts SET completed_at = ? WHERE id = ?', [newDate, workoutRecordId]);
        resolve();
      } catch (error) {
        console.error('Error moving workout to new date:', error);
        reject(error);
      }
    }, 0);
  });
};

// Get workout with exercises
export const getWorkoutWithExercises = async (workoutId) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Get workout details
    const workout = db.getFirstSync('SELECT * FROM workouts WHERE id = ?', [workoutId]);
    
    if (!workout) return null;
    
    // Get exercises for this workout with alternates
    const exercises = db.getAllSync(`
      SELECT e.*, we.exercise_order, we.alternates 
      FROM exercises e 
      JOIN workout_exercises we ON e.id = we.exercise_id 
      WHERE we.workout_id = ? 
      ORDER BY we.exercise_order ASC
    `, [workoutId]);
    
    // Parse alternates JSON for each exercise
    const exercisesWithAlternates = exercises.map(exercise => {
      if (exercise.alternates) {
        try {
          exercise.alternates = JSON.parse(exercise.alternates);
        } catch (error) {
          console.error('Error parsing alternates JSON:', error);
          exercise.alternates = [];
        }
      } else {
        exercise.alternates = [];
      }
      return exercise;
    });
    
    return {
      ...workout,
      exercises: exercisesWithAlternates
    };
  } catch (error) {
    console.error('Error fetching workout with exercises:', error);
    return null;
  }
};

// Add a new workout to database
export const addWorkoutToDB = async (name, num_exercises, duration) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.runSync(
      'INSERT INTO workouts (name, num_exercises, duration, user, "order", major_group) VALUES (?, ?, ?, ?, ?, ?)',
      [name, num_exercises, duration, 'user', 99, 'custom']
    );
    console.log('Workout added successfully');
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding workout:', error);
    throw error;
  }
};

// Add exercises to a workout
export const addExercisesToWorkout = async (workoutId, exercises) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const alternatesJson = exercise.alternates && exercise.alternates.length > 0 
        ? JSON.stringify(exercise.alternates) 
        : null;
      
      db.runSync(
        'INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, alternates) VALUES (?, ?, ?, ?)',
        [workoutId, exercise.id, i, alternatesJson]
      );
    }
    console.log('Exercises added to workout successfully');
    return true;
  } catch (error) {
    console.error('Error adding exercises to workout:', error);
    throw error;
  }
};

// Get all exercises from database including user custom exercises
export const getAllExercises = async (userId = 'default') => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Check if user_id column exists in the exercises table
    try {
      // Try the query with user_id column first
      const result = db.getAllSync(`
        SELECT * FROM exercises 
        WHERE user_id = 'system' OR (user_id = ? AND is_custom = 1)
        ORDER BY is_custom ASC, name ASC
      `, [userId]);
      return result;
    } catch (_columnError) {
      // If user_id column doesn't exist, fallback to basic query
      console.log('user_id column not found, using fallback query');
      const result = db.getAllSync(`
        SELECT * FROM exercises 
        ORDER BY name ASC
      `);
      return result;
    }
  } catch (error) {
    console.error('Error fetching all exercises:', error);
    return [];
  }
};

// Get user's custom exercises
export const getUserCustomExercises = async (userId = 'default') => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getAllSync(`
      SELECT * FROM exercises 
      WHERE user_id = ? AND is_custom = 1 
      ORDER BY name ASC
    `, [userId]);
    return result;
  } catch (error) {
    console.error('Error fetching user custom exercises:', error);
    return [];
  }
};

// Create a new custom exercise
export const createCustomExercise = async (userId = 'default', exerciseData) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const {
      name,
      description = '',
      major_group,
      minor_group = null,
      base_sets = 3,
      base_reps = 10,
      estimated_duration = 10,
      press_pull = null,
      category = 'strength',
      bodyweight = false
    } = exerciseData;
    
    const result = db.runSync(`
      INSERT INTO exercises (
        name, description, major_group, minor_group, base_sets, base_reps, 
        estimated_duration, press_pull, category, bodyweight, user_id, is_custom
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      name, description, major_group, minor_group, base_sets, base_reps,
      estimated_duration, press_pull, category, bodyweight, userId
    ]);
    
    console.log('Custom exercise created successfully');
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating custom exercise:', error);
    throw error;
  }
};

// Update a custom exercise
export const updateCustomExercise = async (exerciseId, exerciseData) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const {
      name,
      description = '',
      major_group,
      minor_group = null,
      base_sets = 3,
      base_reps = 10,
      estimated_duration = 10,
      press_pull = null,
      category = 'strength',
      bodyweight = false
    } = exerciseData;
    
    db.runSync(`
      UPDATE exercises SET 
        name = ?, description = ?, major_group = ?, minor_group = ?, 
        base_sets = ?, base_reps = ?, estimated_duration = ?, 
        press_pull = ?, category = ?, bodyweight = ?
      WHERE id = ? AND is_custom = 1
    `, [
      name, description, major_group, minor_group, base_sets, base_reps,
      estimated_duration, press_pull, category, bodyweight, exerciseId
    ]);
    
    console.log('Custom exercise updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating custom exercise:', error);
    throw error;
  }
};

// Delete a custom exercise
export const deleteCustomExercise = async (exerciseId, userId = 'default') => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // First check if it's a custom exercise by this user
    const exercise = db.getFirstSync(`
      SELECT id FROM exercises 
      WHERE id = ? AND user_id = ? AND is_custom = 1
    `, [exerciseId, userId]);
    
    if (!exercise) {
      throw new Error('Exercise not found or not authorized to delete');
    }
    
    // Delete the exercise (this will cascade to related data)
    db.runSync('DELETE FROM exercises WHERE id = ?', [exerciseId]);
    
    console.log('Custom exercise deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting custom exercise:', error);
    throw error;
  }
};

// Delete a workout from database
export const deleteWorkoutFromDB = async (workoutId) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Delete exercises associated with the workout
    db.runSync('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId]);
    
    // Delete the workout itself
    db.runSync('DELETE FROM workouts WHERE id = ?', [workoutId]);
    
    console.log('Workout deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
};

// Update a workout in database
export const updateWorkoutInDB = async (workoutId, name, numExercises, duration) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    db.runSync(
      'UPDATE workouts SET name = ?, num_exercises = ?, duration = ? WHERE id = ?',
      [name, numExercises, duration, workoutId]
    );
    
    console.log('Workout updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
};

// Delete exercises from a workout
export const removeExercisesFromWorkout = async (workoutId) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    db.runSync('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId]);
    console.log('Exercises removed from workout successfully');
    return true;
  } catch (error) {
    console.error('Error removing exercises from workout:', error);
    throw error;
  }
};

// Get workout count
export const getWorkoutCount = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getFirstSync('SELECT COUNT(*) as count FROM workouts');
    return result.count;
  } catch (error) {
    console.error('Error getting workout count:', error);
    return 0;
  }
};

// Get latest workout
export const getLatestWorkout = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getFirstSync('SELECT * FROM workouts ORDER BY id DESC LIMIT 1');
    return result || null;
  } catch (error) {
    console.error('Error getting latest workout:', error);
    return null;
  }
};

// Add exercise to favorites
export const addExerciseToFavorites = async (exerciseId, userId = 'default') => {
  return new Promise((resolve, reject) => {
    // Use setTimeout to make this truly asynchronous and avoid blocking UI
    setTimeout(() => {
      try {
        if (!db) {
          reject(new Error('Database not initialized'));
          return;
        }
        
        db.runSync(`
          INSERT OR IGNORE INTO exercise_favorites (user_id, exercise_id)
          VALUES (?, ?)
        `, [userId, exerciseId]);
        
        console.log('Exercise added to favorites');
        resolve(true);
      } catch (error) {
        console.error('Error adding exercise to favorites:', error);
        reject(error);
      }
    }, 0);
  });
};

// Remove exercise from favorites
export const removeExerciseFromFavorites = async (exerciseId, userId = 'default') => {
  return new Promise((resolve, reject) => {
    // Use setTimeout to make this truly asynchronous and avoid blocking UI
    setTimeout(() => {
      try {
        if (!db) {
          reject(new Error('Database not initialized'));
          return;
        }
        
        db.runSync(`
          DELETE FROM exercise_favorites 
          WHERE user_id = ? AND exercise_id = ?
        `, [userId, exerciseId]);
        
        console.log('Exercise removed from favorites');
        resolve(true);
      } catch (error) {
        console.error('Error removing exercise from favorites:', error);
        reject(error);
      }
    }, 0);
  });
};

// Check if exercise is favorited by user
export const isExerciseFavorited = async (exerciseId, userId = 'default') => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getFirstSync(`
      SELECT COUNT(*) as count FROM exercise_favorites 
      WHERE user_id = ? AND exercise_id = ?
    `, [userId, exerciseId]);
    
    return result.count > 0;
  } catch (error) {
    console.error('Error checking if exercise is favorited:', error);
    return false;
  }
};

// Get user's favorite exercises
export const getUserFavoriteExercises = async (userId = 'default') => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getAllSync(`
      SELECT e.*, f.created_at as favorited_at
      FROM exercises e
      JOIN exercise_favorites f ON e.id = f.exercise_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [userId]);
    
    return result;
  } catch (error) {
    console.error('Error getting user favorite exercises:', error);
    return [];
  }
};
// Clear and regenerate exercises table (development function)
export const clearAndRegenerateExercises = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    console.log('🏋️ Starting exercise regeneration...');
    
    // Drop exercises table and related data
    console.log('  - Clearing exercise favorites...');
    db.execSync('DELETE FROM exercise_favorites');
    
    console.log('  - Clearing workout-exercise relationships...');
    db.execSync('DELETE FROM workout_exercises');
    
    console.log('  - Clearing exercises table...');
    db.execSync('DELETE FROM exercises');
    
    console.log('  - Clearing existing workouts...');
    db.execSync('DELETE FROM workouts WHERE user = "system"');
    
    console.log('✅ Cleared existing exercises and system workouts data');
    
    // Recreate exercises with fresh data
    console.log(`  - Adding ${INITIAL_EXERCISES.length} default exercises...`);
    let addedCount = 0;
    
    for (const exercise of INITIAL_EXERCISES) {
      db.runSync(`
        INSERT INTO exercises (name, description, major_group, minor_group, base_sets, base_reps, estimated_duration, press_pull, category, bodyweight, user_id, is_custom)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        exercise.name || '',
        exercise.description || '',
        exercise.major_group || '',
        exercise.minor_group || null,
        exercise.base_sets || 3,
        exercise.base_reps || 10,
        exercise.estimated_duration || 10,
        exercise.press_pull || null,
        exercise.category || 'strength',
        exercise.bodyweight || false,
        exercise.user_id || 'system',
        exercise.is_custom || false
      ]);
      addedCount++;
    }
    
    console.log(`✅ Successfully added ${addedCount} exercises`);
    
    // Recreate default system workouts
    console.log('  - Recreating system workouts...');
    try {
      db.execSync(CREATE_DEFAULT_WORKOUTS);
      console.log('✅ System workouts recreated');
      
      // Create workout-exercise relationships
      db.execSync(CREATE_WORKOUT_EXERCISE_RELATIONSHIPS);
      console.log('✅ Workout exercise relationships recreated');
    } catch (workoutError) {
      console.error('⚠️ Error recreating system workouts:', workoutError);
      // Continue anyway, exercises are still valid
    }
    
    console.log('🎉 Exercise and workout regeneration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error clearing and regenerating exercises:', error);
    return false;
  }
};

// User Management Functions

export const createUser = async (username) => {
  if (!db) await initDatabase();
  try {
    const result = db.runSync(`
      INSERT INTO users (username)
      VALUES (?)
    `, [username]);
    
    console.log('User created successfully');
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUsers = async () => {
  if (!db) await initDatabase();
  try {
    const users = db.getAllSync(`
      SELECT 
        id,
        username,
        created_at,
        last_active,
        total_workouts,
        total_exercises,
        longest_streak,
        current_streak,
        settings,
        is_active
      FROM users
      WHERE is_active = 1
        AND username != 'default'
      ORDER BY last_active DESC
    `);
    
    return users.map(user => ({
      ...user,
      settings: JSON.parse(user.settings || '{}')
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const getCurrentUser = async () => {
  if (!db) await initDatabase();
  try {
    const user = db.getFirstSync(`
      SELECT 
        id,
        username,
        created_at,
        last_active,
        total_workouts,
        total_exercises,
        longest_streak,
        current_streak,
        settings,
        is_active
      FROM users
      WHERE is_active = 1
        AND username != 'default'
      ORDER BY last_active DESC
      LIMIT 1
    `);
    
    if (user) {
      return {
        ...user,
        settings: JSON.parse(user.settings || '{}')
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const updateUserStats = async (userId, statsUpdate) => {
  if (!db) await initDatabase();
  try {
    const updates = statsUpdate || {};
    const updateFields = [];
    const updateValues = [];

    if (updates.total_workouts !== undefined) {
      updateFields.push('total_workouts = ?');
      updateValues.push(updates.total_workouts);
    }
    if (updates.total_exercises !== undefined) {
      updateFields.push('total_exercises = ?');
      updateValues.push(updates.total_exercises);
    }
    if (updates.total_sets !== undefined) {
      updateFields.push('total_sets = ?');
      updateValues.push(updates.total_sets);
    }
    if (updates.tons_lifted !== undefined) {
      updateFields.push('tons_lifted = ?');
      updateValues.push(updates.tons_lifted);
    }
    if (updates.total_workout_minutes !== undefined) {
      updateFields.push('total_workout_minutes = ?');
      updateValues.push(updates.total_workout_minutes);
    }
    if (updates.longest_streak !== undefined) {
      updateFields.push('longest_streak = ?');
      updateValues.push(updates.longest_streak);
    }
    if (updates.current_streak !== undefined) {
      updateFields.push('current_streak = ?');
      updateValues.push(updates.current_streak);
    }

    updateFields.push('last_active = CURRENT_TIMESTAMP');

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? OR username = ?`;
    db.runSync(query, [...updateValues, userId, userId]);
    console.log('User stats updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return false;
  }
};

export const updateUserSettings = async (userId, settings) => {
  if (!db) await initDatabase();
  try {
    db.runSync(`
      UPDATE users 
      SET settings = ?, last_active = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [JSON.stringify(settings), userId]);
    
    console.log('User settings updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return false;
  }
};

export const deleteUser = async (userId) => {
  if (!db) await initDatabase();
  try {
    db.runSync('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
    console.log('User deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating user:', error);
    return false;
  }
};

// User Exercises Functions

// Record a completed exercise
export const recordCompletedExercise = async (userId = 'default', exerciseId, exerciseData) => {
  if (!db) await initDatabase();
  try {
    const {
      setsCompleted,
      weightPerSet, // array of weights
      difficultyPerSet, // array of difficulty ratings
      repsPerSet, // array of reps
      comments = '',
      workoutSessionId = null
    } = exerciseData;

    // Insert the exercise record
    const result = db.runSync(`
      INSERT INTO user_exercises 
      (user_id, exercise_id, workout_session_id, sets_completed, weight_per_set, difficulty_per_set, reps_per_set, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      exerciseId,
      workoutSessionId,
      setsCompleted,
      JSON.stringify(weightPerSet),
      JSON.stringify(difficultyPerSet),
      JSON.stringify(repsPerSet),
      comments
    ]);

    // Calculate total weight lifted (tons)
    let totalWeight = 0;
    for (let i = 0; i < setsCompleted; i++) {
      const weight = weightPerSet[i] || 0;
      const reps = repsPerSet[i] || 0;
      totalWeight += weight * reps;
    }
    const tonsLifted = totalWeight / 2000; // Convert to tons (assuming weight in pounds)

    // Update user statistics
    await updateUserExerciseStats(userId, setsCompleted, tonsLifted);

    console.log('Exercise completed and recorded successfully');
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Error recording completed exercise:', error);
    return { success: false, error: error.message };
  }
};

// Update user exercise statistics
export const updateUserExerciseStats = async (userId, additionalSets, additionalTons) => {
  if (!db) await initDatabase();
  try {
    db.runSync(`
      UPDATE users 
      SET total_sets = total_sets + ?, 
          tons_lifted = tons_lifted + ?,
          total_exercises = total_exercises + 1,
          last_active = CURRENT_TIMESTAMP
      WHERE username = ? OR id = ?
    `, [additionalSets, additionalTons, userId, userId]);

    console.log('User exercise statistics updated');
    return true;
  } catch (error) {
    console.error('Error updating user exercise stats:', error);
    return false;
  }
};

// Get user exercise history
export const getUserExerciseHistory = async (userId = 'default', limit = 50) => {
  if (!db) await initDatabase();
  try {
    const result = db.getAllSync(`
      SELECT ue.*, e.name as exercise_name, e.major_group, e.description
      FROM user_exercises ue
      JOIN exercises e ON ue.exercise_id = e.id
      WHERE ue.user_id = ?
      ORDER BY ue.completed_at DESC
      LIMIT ?
    `, [userId, limit]);

    // Parse JSON fields
    return result.map(record => ({
      ...record,
      weight_per_set: JSON.parse(record.weight_per_set || '[]'),
      difficulty_per_set: JSON.parse(record.difficulty_per_set || '[]'),
      reps_per_set: JSON.parse(record.reps_per_set || '[]')
    }));
  } catch (error) {
    console.error('Error getting user exercise history:', error);
    return [];
  }
};

// Get user exercise statistics
export const getUserExerciseStats = async (userId = 'default') => {
  if (!db) await initDatabase();
  try {
    const userStats = db.getFirstSync(`
      SELECT total_sets, tons_lifted, total_exercises
      FROM users 
      WHERE username = ? OR id = ?
    `, [userId, userId]);

    const recentExercises = await getUserExerciseHistory(userId, 10);

    return {
      totalSets: userStats?.total_sets || 0,
      tonsLifted: userStats?.tons_lifted || 0,
      totalExercises: userStats?.total_exercises || 0,
      recentExercises
    };
  } catch (error) {
    console.error('Error getting user exercise stats:', error);
    return {
      totalSets: 0,
      tonsLifted: 0,
      totalExercises: 0,
      recentExercises: []
    };
  }
};

// Check if a specific exercise is completed for a user
export const isExerciseCompleted = async (userId = 'default', exerciseId) => {
  if (!db) await initDatabase();
  try {
    const result = db.getFirstSync(`
      SELECT id FROM user_exercises 
      WHERE user_id = ? AND exercise_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, exerciseId]);
    
    return !!result;
  } catch (error) {
    console.error('Error checking if exercise is completed:', error);
    return false;
  }
};

// Get exercise completion details for a user and exercise
export const getExerciseCompletionDetails = async (userId = 'default', exerciseId) => {
  if (!db) await initDatabase();
  try {
    const result = db.getFirstSync(`
      SELECT *
      FROM user_exercises 
      WHERE user_id = ? AND exercise_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, exerciseId]);
    
    if (result) {
      return {
        ...result,
        weight_per_set: JSON.parse(result.weight_per_set || '[]'),
        difficulty_per_set: JSON.parse(result.difficulty_per_set || '[]'),
        reps_per_set: JSON.parse(result.reps_per_set || '[]')
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting exercise completion details:', error);
    return null;
  }
};

// Delete exercise completion record
export const deleteExerciseCompletion = async (userId = 'default', exerciseId) => {
  if (!db) await initDatabase();
  try {
    const result = db.runSync(`
      DELETE FROM user_exercises 
      WHERE user_id = ? AND exercise_id = ?
    `, [userId, exerciseId]);
    
    console.log('Exercise completion deleted successfully');
    return { success: true, rowsAffected: result.changes };
  } catch (error) {
    console.error('Error deleting exercise completion:', error);
    return { success: false, error: error.message };
  }
};

// Delete all exercise completion records from current active workout session
export const deleteActiveWorkoutExerciseCompletions = async (userId = 'default') => {
  if (!db) await initDatabase();
  try {
    // Get active workout session to find which exercises were completed
    const activeWorkout = db.getFirstSync(
      `SELECT active_workout FROM users WHERE username = ? OR id = ?`,
      [userId, userId]
    );

    if (!activeWorkout?.active_workout) {
      console.log('No active workout to clean up exercise completions for');
      return { success: true, rowsAffected: 0 };
    }

    const workoutId = activeWorkout.active_workout;
    
    // Get all exercises from this workout
    const workoutExercises = db.getAllSync(`
      SELECT we.exercise_id 
      FROM workout_exercises we 
      WHERE we.workout_id = ?
    `, [workoutId]);

    // Also get temp exercises from active workout session
    const sessionData = db.getFirstSync(`
      SELECT temp_exercises FROM active_workout_sessions 
      WHERE user_id = ? AND workout_id = ?
    `, [userId, workoutId]);

    let tempExerciseIds = [];
    if (sessionData?.temp_exercises) {
      try {
        const tempExercises = JSON.parse(sessionData.temp_exercises);
        tempExerciseIds = tempExercises.map(ex => ex.id);
      } catch (error) {
        console.log('Could not parse temp exercises:', error);
      }
    }

    // Combine all exercise IDs
    const allExerciseIds = [
      ...workoutExercises.map(ex => ex.exercise_id),
      ...tempExerciseIds
    ];

    if (allExerciseIds.length === 0) {
      console.log('No exercises to clean up completions for');
      return { success: true, rowsAffected: 0 };
    }

    // Delete all exercise completions for this user and these exercises
    // Use a placeholder string for the IN clause
    const placeholders = allExerciseIds.map(() => '?').join(',');
    const result = db.runSync(`
      DELETE FROM user_exercises 
      WHERE user_id = ? AND exercise_id IN (${placeholders})
    `, [userId, ...allExerciseIds]);

    console.log(`Cleaned up ${result.changes} exercise completion records for active workout`);
    return { success: true, rowsAffected: result.changes };
  } catch (error) {
    console.error('Error deleting active workout exercise completions:', error);
    return { success: false, error: error.message };
  }
};

// Delete exercise completion records for a specific workout session ID
export const deleteWorkoutSessionExerciseCompletions = async (userId = 'default', workoutSessionId) => {
  if (!db) await initDatabase();
  try {
    if (!workoutSessionId) {
      console.log('No workout session ID provided for cleanup');
      return { success: true, rowsAffected: 0 };
    }

    // Delete only exercise completions that match the specific workout session ID
    const result = db.runSync(`
      DELETE FROM user_exercises 
      WHERE user_id = ? AND workout_session_id = ?
    `, [userId, workoutSessionId]);

    console.log(`Cleaned up ${result.changes} exercise completion records for session ${workoutSessionId}`);
    return { success: true, rowsAffected: result.changes };
  } catch (error) {
    console.error('Error deleting workout session exercise completions:', error);
    return { success: false, error: error.message };
  }
};

// Update exercise session IDs to use the workout completion record ID
export const updateExerciseSessionIds = async (userId, oldSessionId, newSessionId) => {
  if (!db) await initDatabase();
  try {
    console.log(`Updating exercise session IDs from ${oldSessionId} to ${newSessionId} for user ${userId}`);
    
    const result = db.runSync(`
      UPDATE user_exercises 
      SET workout_session_id = ?
      WHERE user_id = ? AND workout_session_id = ?
    `, [newSessionId, userId, oldSessionId]);
    
    console.log(`Updated ${result.changes} exercise session IDs`);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('Error updating exercise session IDs:', error);
    return { success: false, error: error.message };
  }
};

// Delete workout completion and associated exercise completions by session GUID
export const deleteWorkoutBySessionGuid = async (userId, sessionGuid) => {
  if (!db) await initDatabase();
  try {
    console.log(`Deleting workout and exercises for session GUID: ${sessionGuid}`);
    
    // Start transaction
    db.execSync('BEGIN TRANSACTION');
    
    try {
      // First delete exercise completions for this session
      const exerciseResult = db.runSync(`
        DELETE FROM user_exercises 
        WHERE user_id = ? AND workout_session_id = ?
      `, [userId, sessionGuid]);
      
      console.log(`Deleted ${exerciseResult.changes} exercise completions for session ${sessionGuid}`);
      
      // Then delete the workout completion
      const workoutResult = db.runSync(`
        DELETE FROM user_workouts 
        WHERE user_id = ? AND session_guid = ?
      `, [userId, sessionGuid]);
      
      console.log(`Deleted ${workoutResult.changes} workout completion for session ${sessionGuid}`);
      
      // Commit transaction
      db.execSync('COMMIT');
      
      return { 
        success: true, 
        exerciseRowsAffected: exerciseResult.changes,
        workoutRowsAffected: workoutResult.changes 
      };
    } catch (error) {
      // Rollback on error
      db.execSync('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting workout by session GUID:', error);
    return { success: false, error: error.message };
  }
};

export const getUserWorkoutHistory = async (userId = 'default', limit = 50) => {
  if (!db) await initDatabase();
  try {
    const rows = db.getAllSync(
      `SELECT * FROM user_workouts WHERE user_id = ? ORDER BY completed_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows;
  } catch (error) {
    console.error('Error getting user workout history:', error);
    return [];
  }
};

export const recordCompletedWorkout = async (userId, workoutId, workoutName, duration, comments, customDate, sessionGuid) => {
  if (!db) await initDatabase();
  try {
    console.log('Recording completed workout:', { userId, workoutId, workoutName, duration, comments, customDate, sessionGuid });
    const finalSessionGuid = sessionGuid || null;
    
    let query, params;
    if (customDate) {
      // Use custom date if provided
      query = `INSERT INTO user_workouts (user_id, workout_id, workout_name, duration, comments, session_guid, completed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
      params = [userId, workoutId, workoutName, duration, comments || '', finalSessionGuid, customDate];
    } else {
      // Use default CURRENT_TIMESTAMP
      query = `INSERT INTO user_workouts (user_id, workout_id, workout_name, duration, comments, session_guid)
               VALUES (?, ?, ?, ?, ?, ?)`;
      params = [userId, workoutId, workoutName, duration, comments || '', finalSessionGuid];
    }
    
    const result = db.runSync(query, params);

    await recalculateUserStatsFromTables(userId);

    console.log('Workout completion recorded successfully');
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Error recording completed workout:', error);
    return { success: false, error: error.message };
  }
};

// User Measurements Functions
export const recordUserMeasurement = async (userId, weight, bodyFatPercentage, customDate = null) => {
  if (!db) await initDatabase();
  try {
    console.log('Recording user measurement:', { userId, weight, bodyFatPercentage, customDate });
    
    let result;
    if (customDate) {
      // Insert with custom date
      result = db.runSync(
        `INSERT INTO user_measurements (user_id, weight_lbs, body_fat_percentage, recorded_at)
         VALUES (?, ?, ?, ?)`
        , [userId, weight, bodyFatPercentage || null, customDate]
      );
    } else {
      // Insert with current timestamp (default behavior)
      result = db.runSync(
        `INSERT INTO user_measurements (user_id, weight_lbs, body_fat_percentage)
         VALUES (?, ?, ?)`
        , [userId, weight, bodyFatPercentage || null]
      );
    }

    console.log('User measurement recorded successfully');
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Error recording user measurement:', error);
    return { success: false, error: error.message };
  }
};

export const getUserMeasurementHistory = async (userId, limit = 100) => {
  if (!db) await initDatabase();
  try {
    const result = db.getAllSync(
      `SELECT * FROM user_measurements WHERE user_id = ? ORDER BY recorded_at DESC LIMIT ?`,
      [userId, limit]
    );
    
    return result;
  } catch (error) {
    console.error('Error getting user measurement history:', error);
    return [];
  }
};

export const getLatestUserMeasurement = async (userId) => {
  if (!db) await initDatabase();
  try {
    const result = db.getFirstSync(
      `SELECT * FROM user_measurements WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1`,
      [userId]
    );
    
    return result || null;
  } catch (error) {
    console.error('Error getting latest user measurement:', error);
    return null;
  }
};

export const deleteUserMeasurement = async (userId, measurementId) => {
  if (!db) await initDatabase();
  try {
    const result = db.runSync(
      `DELETE FROM user_measurements WHERE user_id = ? AND id = ?`,
      [userId, measurementId]
    );

    return { success: true, rowsAffected: result.changes };
  } catch (error) {
    console.error('Error deleting user measurement:', error);
    return { success: false, error: error.message };
  }
};

export const deleteWorkoutCompletion = async (userId, workoutRecordId) => {
  if (!db) await initDatabase();
  try {
    // Get workout details before deletion to know which exercises to clean up
    const workoutRecord = db.getFirstSync(
      `SELECT workout_id, completed_at, session_guid FROM user_workouts WHERE user_id = ? AND id = ?`,
      [userId, workoutRecordId]
    );

    if (!workoutRecord) {
      console.log('Workout record not found for cleanup');
      return { success: false, error: 'Workout record not found' };
    }

    if (workoutRecord.session_guid) {
      console.log(`Redirecting deletion to session GUID cleanup for workout ${workoutRecordId}`);
      return await deleteWorkoutBySessionGuid(userId, workoutRecord.session_guid);
    }

    const workoutId = workoutRecord.workout_id;
    const completedAt = workoutRecord.completed_at;

    // Get all exercises that were part of this workout
    const workoutExercises = db.getAllSync(`
      SELECT we.exercise_id 
      FROM workout_exercises we 
      WHERE we.workout_id = ?
    `, [workoutId]);

    // Delete the workout completion record
    const result = db.runSync(
      `DELETE FROM user_workouts WHERE user_id = ? AND id = ?`,
      [userId, workoutRecordId]
    );

    // Clean up exercise completions that were recorded around the same time as this workout
    // We'll clean up exercise completions for these exercises that happened within a reasonable time window
    if (workoutExercises.length > 0 && completedAt) {
      const exerciseIds = workoutExercises.map(ex => ex.exercise_id);
      const placeholders = exerciseIds.map(() => '?').join(',');
      
      // Delete exercise completions for this user and these exercises that were completed within
      // a 6-hour window around the workout completion time (generous buffer for workout duration)
      const cleanupResult = db.runSync(`
        DELETE FROM user_exercises 
        WHERE user_id = ? 
        AND exercise_id IN (${placeholders})
        AND datetime(completed_at) BETWEEN datetime(?, '-3 hours') AND datetime(?, '+3 hours')
      `, [userId, ...exerciseIds, completedAt, completedAt]);

      console.log(`Cleaned up ${cleanupResult.changes} exercise completion records for workout ${workoutRecordId}`);
    }

    await recalculateUserStatsFromTables(userId);
    return { success: true, rowsAffected: result.changes };
  } catch (error) {
    console.error('Error deleting workout completion:', error);
    return { success: false, error: error.message };
  }
};

// Calculate weekly workout streak
const calculateWeeklyStreak = (userWorkouts) => {
  if (userWorkouts.length === 0) return 0;
  
  // Group workouts by week (ISO week)
  const workoutWeeks = new Set();
  userWorkouts.forEach(workout => {
    const date = new Date(workout.completed_at);
    // Get ISO week number
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    const weekKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    workoutWeeks.add(weekKey);
  });
  
  // Sort weeks in descending order
  const sortedWeeks = Array.from(workoutWeeks).sort().reverse();
  
  if (sortedWeeks.length === 0) return 0;
  
  // Calculate current week
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - startOfYear) / 86400000;
  const currentWeekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  const currentWeekKey = `${now.getFullYear()}-W${currentWeekNumber.toString().padStart(2, '0')}`;
  
  // Count consecutive weeks from current or last week
  let streak = 0;
  let checkWeek = currentWeekKey;
  
  // Start checking from current week or previous week if current week has no workouts
  if (!sortedWeeks.includes(currentWeekKey)) {
    // Check if we should start from previous week
    const previousWeekNumber = currentWeekNumber > 1 ? currentWeekNumber - 1 : 52;
    const previousYear = currentWeekNumber > 1 ? now.getFullYear() : now.getFullYear() - 1;
    checkWeek = `${previousYear}-W${previousWeekNumber.toString().padStart(2, '0')}`;
  }
  
  // Count consecutive weeks backwards
  while (sortedWeeks.includes(checkWeek)) {
    streak++;
    
    // Calculate previous week
    const [yearStr, weekStr] = checkWeek.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);
    
    const previousWeekNumber = week > 1 ? week - 1 : 52;
    const previousYear = week > 1 ? year : year - 1;
    checkWeek = `${previousYear}-W${previousWeekNumber.toString().padStart(2, '0')}`;
  }
  
  return streak;
};

export const recalculateUserStatsFromTables = async (userId) => {
  if (!db) await initDatabase();
  try {
    console.log('Recalculating stats for user:', userId);

    const userWorkouts = await getUserWorkoutHistory(userId, 1000);
    const userExercises = await getUserExerciseHistory(userId, 1000);

    const totalWorkouts = userWorkouts.length;
    const totalExercises = userExercises.length;
    const totalWorkoutMinutes = userWorkouts.reduce(
      (sum, workout) => sum + (Number(workout.duration) || 0),
      0
    );

    // Calculate weekly streak
    const currentStreak = calculateWeeklyStreak(userWorkouts);

    let totalSets = 0;
    let totalWeight = 0;

    userExercises.forEach((exercise) => {
      const setsCompleted = Number(exercise.sets_completed) || 0;
      totalSets += setsCompleted;

      const weights = Array.isArray(exercise.weight_per_set) ? exercise.weight_per_set : [];
      const reps = Array.isArray(exercise.reps_per_set) ? exercise.reps_per_set : [];
      const loopCount = Math.max(weights.length, reps.length);

      for (let index = 0; index < loopCount; index += 1) {
        const weight = Number(weights[index]) || 0;
        const repCount = Number(reps[index]) || 0;
        totalWeight += weight * repCount;
      }
    });

    const totalTons = totalWeight / 2000;

    db.runSync(
      `UPDATE users
         SET total_workouts = ?,
             total_exercises = ?,
             total_sets = ?,
             tons_lifted = ?,
             total_workout_minutes = ?,
             current_streak = ?,
             last_active = CURRENT_TIMESTAMP
       WHERE username = ? OR id = ?`,
      [totalWorkouts, totalExercises, totalSets, totalTons, totalWorkoutMinutes, currentStreak, userId, userId]
    );

    console.log('Calculated stats from tables:', {
      totalWorkouts,
      totalExercises,
      totalSets,
      totalTons: totalTons.toFixed(3),
      totalWorkoutMinutes,
      currentStreak,
    });

    return {
      success: true,
      stats: {
        total_workouts: totalWorkouts,
        total_exercises: totalExercises,
        total_sets: totalSets,
        tons_lifted: totalTons,
        total_workout_minutes: totalWorkoutMinutes,
        current_streak: currentStreak
      }
    };
  } catch (error) {
    console.error('Error recalculating user stats:', error);
    return false;
  }
};

export const clearUserStats = async (userId = 'default') => {
  if (!db) await initDatabase();
  try {
    console.log('🧹 Starting user stats clear and regeneration...');

    db.runSync('DELETE FROM user_workouts WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM user_exercises WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM active_workout_sessions WHERE user_id = ?', [userId]);

    const updateResult = db.runSync(
      `UPDATE users
         SET total_workouts = 0,
             total_exercises = 0,
             total_sets = 0,
             tons_lifted = 0,
             total_workout_minutes = 0,
             current_streak = 0,
             longest_streak = 0,
             active_workout = NULL,
             last_active = CURRENT_TIMESTAMP
       WHERE username = ? OR id = ?`,
      [userId, userId]
    );

    if (updateResult.changes === 0) {
      console.error('User not found for stats reset:', userId);
      return { success: false, error: 'User not found' };
    }

    console.log('✅ User stats cleared and regenerated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error clearing user stats:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllUserData = async () => {
  if (!db) await initDatabase();
  try {
    console.log('🧹 Clearing all user data...');

    // Clear all user-related data
    console.log('  - Clearing user exercises...');
    db.execSync('DELETE FROM user_exercises');
    
    console.log('  - Clearing user workouts...');
    db.execSync('DELETE FROM user_workouts');
    
    console.log('  - Clearing user measurements...');
    db.execSync('DELETE FROM user_measurements');
    
    console.log('  - Clearing exercise favorites...');
    db.execSync('DELETE FROM exercise_favorites');
    
    console.log('  - Clearing active workout sessions...');
    db.execSync('DELETE FROM active_workout_sessions');
    
    console.log('  - Clearing user sessions...');
    db.execSync('DELETE FROM user_sessions');
    
    console.log('  - Clearing all users (including usernames)...');
    db.execSync('DELETE FROM users');
    
    console.log('  - Clearing user-created workouts...');
    db.execSync('DELETE FROM workouts WHERE user != "system"');
    
    console.log('✅ All user data cleared');
    
    // Ensure system workouts exist
    console.log('  - Checking system workouts...');
    const systemWorkoutCount = db.getFirstSync('SELECT COUNT(*) as count FROM workouts WHERE user = "system"');
    if (systemWorkoutCount.count === 0) {
      console.log('  - Recreating system workouts...');
      try {
        db.execSync(CREATE_DEFAULT_WORKOUTS);
        db.execSync(CREATE_WORKOUT_EXERCISE_RELATIONSHIPS);
        console.log('✅ System workouts recreated');
      } catch (workoutError) {
        console.error('⚠️ Error recreating system workouts:', workoutError);
      }
    }

    console.log('🎉 All user data cleared and system data regenerated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error clearing user data:', error);
    return { success: false, error: error.message };
  }
};

export const setActiveWorkout = async (userId = 'default', workoutId) => {
  if (!db) await initDatabase();
  try {
    const result = db.runSync(
      `UPDATE users SET active_workout = ?, last_active = CURRENT_TIMESTAMP WHERE username = ? OR id = ?`,
      [workoutId, userId, userId]
    );

    if (result.changes === 0) {
      return { success: false, error: 'User not found' };
    }

    console.log(`Set active workout ${workoutId} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting active workout:', error);
    return { success: false, error: error.message };
  }
};

export const getActiveWorkout = async (userId = 'default') => {
  if (!db) await initDatabase();
  try {
    const record = db.getFirstSync(
      `SELECT active_workout FROM users WHERE username = ? OR id = ?`,
      [userId, userId]
    );

    return record ? record.active_workout : null;
  } catch (error) {
    console.error('Error getting active workout:', error);
    return null;
  }
};

export const clearActiveWorkoutSession = async (userId = 'default', workoutId) => {
  if (!db) await initDatabase();
  try {
    db.runSync(
      `DELETE FROM active_workout_sessions WHERE user_id = ? AND workout_id = ?`,
      [userId, workoutId]
    );

    console.log(`Cleared workout session for user ${userId}, workout ${workoutId}`);
    return { success: true };
  } catch (error) {
    console.error('Error clearing active workout session:', error);
    return { success: false, error: error.message };
  }
};

export const clearActiveWorkout = async (userId = 'default') => {
  if (!db) await initDatabase();
  try {
    const record = db.getFirstSync(
      `SELECT active_workout FROM users WHERE username = ? OR id = ?`,
      [userId, userId]
    );

    if (!record) {
      return { success: false, error: 'User not found' };
    }

    const activeWorkoutId = record.active_workout;

    db.runSync(
      `UPDATE users SET active_workout = NULL, last_active = CURRENT_TIMESTAMP WHERE username = ? OR id = ?`,
      [userId, userId]
    );

    if (activeWorkoutId) {
      await clearActiveWorkoutSession(userId, activeWorkoutId);
    }

    console.log(`Cleared active workout for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error clearing active workout:', error);
    return { success: false, error: error.message };
  }
};

export const saveActiveWorkoutSession = async (userId = 'default', workoutId, exerciseStates, tempExercises = [], sessionGuid = null) => {
  if (!db) await initDatabase();
  try {
    db.runSync(
      `INSERT INTO active_workout_sessions (user_id, workout_id, session_guid, exercise_states, temp_exercises, last_updated)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, workout_id)
       DO UPDATE SET session_guid = excluded.session_guid,
                     exercise_states = excluded.exercise_states,
                     temp_exercises = excluded.temp_exercises,
                     last_updated = CURRENT_TIMESTAMP`,
      [
        userId,
        workoutId,
        sessionGuid,
        JSON.stringify(exerciseStates || {}),
        JSON.stringify(tempExercises || [])
      ]
    );

    console.log(`Saved workout session for user ${userId}, workout ${workoutId}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving active workout session:', error);
    return { success: false, error: error.message };
  }
};

export const getActiveWorkoutSession = async (userId = 'default', workoutId) => {
  if (!db) await initDatabase();
  try {
    const record = db.getFirstSync(
      `SELECT user_id, workout_id, session_guid, exercise_states, temp_exercises, last_updated
       FROM active_workout_sessions
       WHERE user_id = ? AND workout_id = ?`,
      [userId, workoutId]
    );

    if (!record) {
      return null;
    }

    const safeParse = (value, fallback) => {
      if (value === null || value === undefined) {
        return fallback;
      }
      try {
        return JSON.parse(value);
      } catch (_error) {
        return fallback;
      }
    };

    return {
      userId: record.user_id,
      workoutId: record.workout_id,
      sessionGuid: record.session_guid,
      exerciseStates: safeParse(record.exercise_states, {}),
      tempExercises: safeParse(record.temp_exercises, []),
      lastUpdated: record.last_updated
    };
  } catch (error) {
    console.error('Error getting active workout session:', error);
    return null;
  }
};

export const debugUsers = async () => {
  if (!db) await initDatabase();
  try {
    const users = db.getAllSync('SELECT * FROM users');
    console.log('Debug users:', users);
    return users;
  } catch (error) {
    console.error('Error debugging users:', error);
    return [];
  }
};

export const debugUserExercises = async () => {
  if (!db) await initDatabase();
  try {
    const exercises = db.getAllSync(
      'SELECT * FROM user_exercises ORDER BY completed_at DESC LIMIT 100'
    );
    console.log('Debug user exercises count:', exercises.length);
    return exercises;
  } catch (error) {
    console.error('Error debugging user exercises:', error);
    return [];
  }
};

export const debugUserWorkouts = async () => {
  if (!db) await initDatabase();
  try {
    const workouts = db.getAllSync(
      'SELECT * FROM user_workouts ORDER BY completed_at DESC LIMIT 100'
    );
    console.log('Debug user workouts count:', workouts.length);
    return workouts;
  } catch (error) {
    console.error('Error debugging user workouts:', error);
    return [];
  }
};

// Export user workouts data as CSV
export const exportWorkoutsToCSV = async (userId) => {
  if (!db) await initDatabase();
  try {
    const workouts = db.getAllSync(
      'SELECT id, user_id, workout_id, workout_name, duration, comments, session_guid, completed_at FROM user_workouts WHERE user_id = ? ORDER BY completed_at DESC',
      [userId]
    );

    if (workouts.length === 0) {
      return { success: false, message: 'No workout data found to export' };
    }

    // Create CSV header
    const headers = ['ID', 'User ID', 'Workout ID', 'Workout Name', 'Duration (minutes)', 'Comments', 'Session ID', 'Completed Date'];
    
    // Create CSV rows
    const csvRows = [headers.join(',')];
    
    workouts.forEach(workout => {
      const row = [
        workout.id || '',
        workout.user_id || '',
        workout.workout_id || '',
        `"${(workout.workout_name || '').replace(/"/g, '""')}"`, // Escape quotes
        workout.duration || 0,
        `"${(workout.comments || '').replace(/"/g, '""')}"`, // Escape quotes
        workout.session_guid || '',
        workout.completed_at || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    
    return { 
      success: true, 
      data: csvContent, 
      count: workouts.length,
      filename: `workouts_${userId}_${new Date().toISOString().split('T')[0]}.csv`
    };
  } catch (error) {
    console.error('Error exporting workouts:', error);
    return { success: false, error: error.message };
  }
};

// Export user profile and measurements data as CSV
export const exportUserDataToCSV = async (userId) => {
  if (!db) await initDatabase();
  try {
    // Get user profile data
    const users = db.getAllSync(
      'SELECT id, username, created_at, last_active, total_workouts, total_exercises, total_sets, tons_lifted, total_workout_minutes, current_streak, longest_streak, is_active FROM users WHERE username = ? OR id = ?',
      [userId, userId]
    );

    // Get user measurements
    const measurements = db.getAllSync(
      'SELECT id, user_id, weight_lbs, body_fat_percentage, recorded_at FROM user_measurements WHERE user_id = ? ORDER BY recorded_at DESC',
      [userId]
    );

    if (users.length === 0) {
      return { success: false, message: 'No user data found to export' };
    }

    const csvSections = [];

    // User Profile Section
    csvSections.push('USER PROFILE DATA');
    const userHeaders = ['ID', 'Username', 'Created', 'Last Active', 'Total Workouts', 'Total Exercises', 'Total Sets', 'Weight Lifted (tons)', 'Total Minutes', 'Current Streak', 'Longest Streak', 'Active'];
    csvSections.push(userHeaders.join(','));
    
    users.forEach(user => {
      const row = [
        user.id || '',
        `"${(user.username || '').replace(/"/g, '""')}"`,
        user.created_at || '',
        user.last_active || '',
        user.total_workouts || 0,
        user.total_exercises || 0,
        user.total_sets || 0,
        user.tons_lifted || 0,
        user.total_workout_minutes || 0,
        user.current_streak || 0,
        user.longest_streak || 0,
        user.is_active || 0
      ];
      csvSections.push(row.join(','));
    });

    // Measurements Section
    if (measurements.length > 0) {
      csvSections.push(''); // Empty line
      csvSections.push('MEASUREMENTS DATA');
      const measurementHeaders = ['ID', 'User ID', 'Weight', 'Body Fat %', 'Recorded Date'];
      csvSections.push(measurementHeaders.join(','));
      
      measurements.forEach(measurement => {
        const row = [
          measurement.id || '',
          measurement.user_id || '',
          measurement.weight_lbs || '',
          measurement.body_fat_percentage || '',
          measurement.recorded_at || ''
        ];
        csvSections.push(row.join(','));
      });
    }

    const csvContent = csvSections.join('\n');
    
    return { 
      success: true, 
      data: csvContent, 
      userCount: users.length,
      measurementCount: measurements.length,
      filename: `user_data_${userId}_${new Date().toISOString().split('T')[0]}.csv`
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return { success: false, error: error.message };
  }
};

