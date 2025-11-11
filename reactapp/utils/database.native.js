// Native-specific database implementation using SQLite
import * as SQLite from 'expo-sqlite';
import { CREATE_EXERCISES_TABLE, INITIAL_EXERCISES } from './tables/createExercisesTable';
import { CREATE_FAVORITES_TABLE } from './tables/createFavoritesTable';
import { CREATE_USER_EXERCISES_TABLE } from './tables/createUserExercisesTable';
import { createUserSessionsTable, createUsersTable } from './tables/createUsersTable';
import { CREATE_DEFAULT_WORKOUTS, CREATE_WORKOUTS_TABLE, CREATE_WORKOUT_EXERCISES_JOIN } from './tables/createWorkoutsTable';

let db = null;

// Initialize database tables
export const initDatabase = async () => {
  try {
    if (!db) {
      db = SQLite.openDatabaseSync('workoutTracker.db');
      console.log('Database opened successfully');
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
    
    // Check if exercises table has data, if not insert exercises
    const exerciseResult = db.getFirstSync('SELECT COUNT(*) as count FROM exercises');
    if (exerciseResult.count === 0) {
      try {
        for (const exercise of INITIAL_EXERCISES) {
          db.runSync(`
            INSERT INTO exercises (name, description, major_group, minor_group, base_sets, base_reps, estimated_duration, press_pull, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            exercise.name || '',
            exercise.description || '',
            exercise.major_group || '',
            exercise.minor_group || null,
            exercise.base_sets || 3,
            exercise.base_reps || 10,
            exercise.estimated_duration || 10,
            exercise.press_pull || null,
            exercise.category || 'strength'
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
    }
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Get all workouts from database
export const getWorkoutsFromDB = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getAllSync('SELECT * FROM workouts ORDER BY "order" ASC');
    return result;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }
};

// Get workout with exercises
export const getWorkoutWithExercises = async (workoutId) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Get workout details
    const workout = db.getFirstSync('SELECT * FROM workouts WHERE id = ?', [workoutId]);
    
    if (!workout) return null;
    
    // Get exercises for this workout
    const exercises = db.getAllSync(`
      SELECT e.*, we.exercise_order 
      FROM exercises e 
      JOIN workout_exercises we ON e.id = we.exercise_id 
      WHERE we.workout_id = ? 
      ORDER BY we.exercise_order ASC
    `, [workoutId]);
    
    return {
      ...workout,
      exercises: exercises
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
      db.runSync(
        'INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order) VALUES (?, ?, ?)',
        [workoutId, exercise.id, i]
      );
    }
    console.log('Exercises added to workout successfully');
    return true;
  } catch (error) {
    console.error('Error adding exercises to workout:', error);
    throw error;
  }
};

// Get all exercises from database
export const getAllExercises = async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.getAllSync('SELECT * FROM exercises ORDER BY name ASC');
    return result;
  } catch (error) {
    console.error('Error fetching all exercises:', error);
    return [];
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
  try {
    if (!db) throw new Error('Database not initialized');
    
    db.runSync(`
      INSERT OR IGNORE INTO exercise_favorites (user_id, exercise_id)
      VALUES (?, ?)
    `, [userId, exerciseId]);
    
    console.log('Exercise added to favorites');
    return true;
  } catch (error) {
    console.error('Error adding exercise to favorites:', error);
    return false;
  }
};

// Remove exercise from favorites
export const removeExerciseFromFavorites = async (exerciseId, userId = 'default') => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    db.runSync(`
      DELETE FROM exercise_favorites 
      WHERE user_id = ? AND exercise_id = ?
    `, [userId, exerciseId]);
    
    console.log('Exercise removed from favorites');
    return true;
  } catch (error) {
    console.error('Error removing exercise from favorites:', error);
    return false;
  }
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
    
    console.log('✅ Cleared existing exercises data');
    
    // Recreate exercises with fresh data
    console.log(`  - Adding ${INITIAL_EXERCISES.length} default exercises...`);
    let addedCount = 0;
    
    for (const exercise of INITIAL_EXERCISES) {
      db.runSync(`
        INSERT INTO exercises (name, description, major_group, minor_group, base_sets, base_reps, estimated_duration, press_pull, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        exercise.name || '',
        exercise.description || '',
        exercise.major_group || '',
        exercise.minor_group || null,
        exercise.base_sets || 3,
        exercise.base_reps || 10,
        exercise.estimated_duration || 10,
        exercise.press_pull || null,
        exercise.category || 'strength'
      ]);
      addedCount++;
    }
    
    console.log(`✅ Successfully added ${addedCount} exercises`);
    console.log('🎉 Exercise table regeneration completed successfully!');
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
    const updateFields = [];
    const updateValues = [];
    
    if (statsUpdate.total_workouts !== undefined) {
      updateFields.push('total_workouts = ?');
      updateValues.push(statsUpdate.total_workouts);
    }
    if (statsUpdate.total_exercises !== undefined) {
      updateFields.push('total_exercises = ?');
      updateValues.push(statsUpdate.total_exercises);
    }
    if (statsUpdate.longest_streak !== undefined) {
      updateFields.push('longest_streak = ?');
      updateValues.push(statsUpdate.longest_streak);
    }
    if (statsUpdate.current_streak !== undefined) {
      updateFields.push('current_streak = ?');
      updateValues.push(statsUpdate.current_streak);
    }
    
    updateFields.push('last_active = CURRENT_TIMESTAMP');
    updateValues.push(userId);
    
    if (updateFields.length > 1) { // More than just last_active
      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      db.runSync(query, updateValues);
      console.log('User stats updated successfully');
    }
    
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