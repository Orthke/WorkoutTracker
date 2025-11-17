// Web-specific database implementation using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKOUTS_KEY = 'workouts';
const EXERCISES_KEY = 'exercises';
const USERS_KEY = 'users';
const USER_SESSIONS_KEY = 'user_sessions';
const EXERCISE_FAVORITES_KEY = 'exercise_favorites';
const USER_EXERCISES_KEY = 'user_exercises';
const USER_WORKOUTS_KEY = 'user_workouts';
const ACTIVE_WORKOUT_SESSIONS_KEY = 'active_workout_sessions';

// Initialize database tables
export const initDatabase = async () => {
  try {
    console.log('Using AsyncStorage fallback for web');
    
    const existingWorkouts = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (!existingWorkouts) {
      // Create sample workouts data
      const sampleWorkouts = [
        { id: 1, name: 'Push Power', num_exercises: 3, duration: 32, user: 'kelton', order: 1, major_group: 'chest, arms' },
        { id: 2, name: 'Leg Day Builder', num_exercises: 3, duration: 30, user: 'kelton', order: 2, major_group: 'legs' },
        { id: 3, name: 'Back and Biceps', num_exercises: 3, duration: 28, user: 'kelton', order: 3, major_group: 'back, arms' }
      ];
      
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(sampleWorkouts));
      console.log('Sample workouts created for web');
    }
    
    const existingExercises = await AsyncStorage.getItem(EXERCISES_KEY);
    if (!existingExercises) {
      // Import all exercises from the exercises table
      const { INITIAL_EXERCISES } = await import('./tables/createExercisesTable.js');
      const exercisesWithIds = INITIAL_EXERCISES.map((exercise, index) => ({
        ...exercise,
        id: index + 1
      }));
      
      await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercisesWithIds));
      console.log('All exercises created for web');
    }
    
    // Initialize user exercises storage if it doesn't exist
    const existingUserExercises = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!existingUserExercises) {
      await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify([]));
      console.log('User exercises storage initialized for web');
    }
    
    // Initialize user workouts storage if it doesn't exist
    const existingUserWorkouts = await AsyncStorage.getItem(USER_WORKOUTS_KEY);
    if (!existingUserWorkouts) {
      await AsyncStorage.setItem(USER_WORKOUTS_KEY, JSON.stringify([]));
      console.log('User workouts storage initialized for web');
    }
    
    // Initialize active workout sessions storage if it doesn't exist
    const existingActiveWorkoutSessions = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSIONS_KEY);
    if (!existingActiveWorkoutSessions) {
      await AsyncStorage.setItem(ACTIVE_WORKOUT_SESSIONS_KEY, JSON.stringify({}));
      console.log('Active workout sessions storage initialized for web');
    }
    
    // Upgrade existing users with new columns
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    if (existingUsers) {
      const users = JSON.parse(existingUsers);
      let updated = false;
      
      users.forEach(user => {
        if (user.total_sets === undefined) {
          user.total_sets = 0;
          updated = true;
        }
        if (user.tons_lifted === undefined) {
          user.tons_lifted = 0.0;
          updated = true;
        }
        if (user.total_workout_minutes === undefined) {
          user.total_workout_minutes = 0;
          updated = true;
        }
        if (user.active_workout === undefined) {
          user.active_workout = null;
          updated = true;
        }
      });
      
      if (updated) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        console.log('Upgraded existing users with new statistics columns');
      }

      // Ensure default user exists
      const defaultUser = users.find(user => user.username === 'default');
      if (!defaultUser) {
        users.push({
          id: users.length + 1,
          username: 'default',
          total_workouts: 0,
          total_exercises: 0,
          total_sets: 0,
          tons_lifted: 0.0,
          total_workout_minutes: 0,
          longest_streak: 0,
          current_streak: 0,
          active_workout: null,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        });
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        console.log('Created default user for web');
      }
    } else {
      // Create default user if no users exist
      const defaultUser = [{
        id: 1,
        username: 'default',
        total_workouts: 0,
        total_exercises: 0,
        total_sets: 0,
        tons_lifted: 0.0,
        total_workout_minutes: 0,
        current_streak: 0,
        active_workout: null,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      }];
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(defaultUser));
      console.log('Created default user for web');
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Repair system workouts that exist but have no exercise relationships (web version)
export const repairSystemWorkouts = async () => {
  try {
    console.log('🔧 Checking system workouts for missing exercises (Web/AsyncStorage)...');
    
    // Check if system workouts exist
    const workoutsData = await AsyncStorage.getItem(WORKOUTS_KEY);
    const workouts = workoutsData ? JSON.parse(workoutsData) : [];
    const systemWorkouts = workouts.filter(w => w.user === 'system');
    
    if (systemWorkouts.length === 0) {
      console.log('  - No system workouts found, creating them...');
      const defaultSystemWorkouts = [
        { id: 1, name: 'Push Power', num_exercises: 3, duration: 32, user: 'system', order: 1, major_group: 'chest, arms' },
        { id: 2, name: 'Leg Day Builder', num_exercises: 3, duration: 30, user: 'system', order: 2, major_group: 'legs' },
        { id: 3, name: 'Back and Biceps', num_exercises: 3, duration: 28, user: 'system', order: 3, major_group: 'back, arms' }
      ];
      const updatedWorkouts = [...workouts, ...defaultSystemWorkouts];
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts));
      console.log('✅ System workouts created');
    }
    
    console.log('✅ System workouts verified (Web version uses hardcoded exercise relationships)');
    return { success: true, message: 'System workouts verified successfully' };
    
  } catch (error) {
    console.error('❌ Error repairing system workouts:', error);
    return { success: false, error: error.message };
  }
};

// Get all workouts from database
export const getWorkoutsFromDB = async () => {
  try {
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (data) {
      return JSON.parse(data).sort((a, b) => a.order - b.order);
    }
    return [];
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }
};

// Get workout with exercises
export const getWorkoutWithExercises = async (workoutId) => {
  try {
    const workoutsData = await AsyncStorage.getItem(WORKOUTS_KEY);
    
    if (!workoutsData) return null;
    
    const workouts = JSON.parse(workoutsData);
    const workout = workouts.find(w => w.id === parseInt(workoutId));
    
    if (!workout) return null;
    
    // Try to get exercises from the workout_exercises relationship
    const WORKOUT_EXERCISES_KEY = `workout_exercises_${workoutId}`;
    const workoutExercisesData = await AsyncStorage.getItem(WORKOUT_EXERCISES_KEY);
    
    let workoutExercises = [];
    
    if (workoutExercisesData) {
      // Use stored exercise relationships for custom workouts
      const storedExercises = JSON.parse(workoutExercisesData);
      workoutExercises = storedExercises.map(item => item.exercise).sort((a, b) => {
        const aOrder = storedExercises.find(se => se.exercise_id === a.id)?.exercise_order || 0;
        const bOrder = storedExercises.find(se => se.exercise_id === b.id)?.exercise_order || 0;
        return aOrder - bOrder;
      });
    } else {
      // Fall back to hardcoded exercises for sample workouts
      const exercisesData = await AsyncStorage.getItem(EXERCISES_KEY);
      if (!exercisesData) return { ...workout, exercises: [] };
      
      const exercises = JSON.parse(exercisesData);
      
      if (workout.name === 'Push Power') {
        workoutExercises = exercises.filter(e => ['Incline Bench Press', 'Bench Press', 'Tricep Extension'].includes(e.name));
      } else if (workout.name === 'Leg Day Builder') {
        workoutExercises = exercises.filter(e => ['Front Squat', 'Leg Press', 'Calf Raise'].includes(e.name));
      } else if (workout.name === 'Back and Biceps') {
        workoutExercises = exercises.filter(e => ['Pullup', 'Seated Cable Row', 'Bicep Curl'].includes(e.name));
      }
    }
    
    return {
      ...workout,
      exercises: workoutExercises
    };
  } catch (error) {
    console.error('Error fetching workout with exercises:', error);
    return null;
  }
};

// Add a new workout to database
export const addWorkoutToDB = async (name, num_exercises, duration) => {
  try {
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    const workouts = data ? JSON.parse(data) : [];
    const newId = Math.max(...workouts.map(w => w.id), 0) + 1;
    
    const newWorkout = {
      id: newId,
      name,
      num_exercises,
      duration,
      user: 'user',
      order: 99,
      major_group: 'custom'
    };
    
    workouts.push(newWorkout);
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    console.log('Workout added successfully');
    return newId;
  } catch (error) {
    console.error('Error adding workout:', error);
    throw error;
  }
};

// Add exercises to a workout (web implementation - stores in a separate key)
export const addExercisesToWorkout = async (workoutId, exercises) => {
  try {
    const WORKOUT_EXERCISES_KEY = `workout_exercises_${workoutId}`;
    const exerciseData = exercises.map((exercise, index) => ({
      workout_id: workoutId,
      exercise_id: exercise.id,
      exercise_order: index,
      exercise: exercise // Store the full exercise data for easy access
    }));
    
    await AsyncStorage.setItem(WORKOUT_EXERCISES_KEY, JSON.stringify(exerciseData));
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
    const data = await AsyncStorage.getItem(EXERCISES_KEY);
    if (data) {
      const exercises = JSON.parse(data);
      // Return system exercises and user's custom exercises
      // Handle cases where user_id might not exist on older data
      return exercises.filter(exercise => 
        (exercise.user_id === 'system' || exercise.user_id === undefined) || 
        (exercise.user_id === userId && exercise.is_custom === true)
      ).sort((a, b) => {
        // Sort system exercises first, then by name
        if (a.is_custom === b.is_custom) {
          return a.name.localeCompare(b.name);
        }
        return a.is_custom ? 1 : -1;
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching all exercises:', error);
    return [];
  }
};

// Get user's custom exercises
export const getUserCustomExercises = async (userId = 'default') => {
  try {
    const data = await AsyncStorage.getItem(EXERCISES_KEY);
    if (data) {
      const exercises = JSON.parse(data);
      return exercises.filter(exercise => 
        exercise.user_id === userId && exercise.is_custom === true
      );
    }
    return [];
  } catch (error) {
    console.error('Error fetching user custom exercises:', error);
    return [];
  }
};

// Create a new custom exercise
export const createCustomExercise = async (userId = 'default', exerciseData) => {
  try {
    const data = await AsyncStorage.getItem(EXERCISES_KEY);
    const exercises = data ? JSON.parse(data) : [];
    
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
    
    const newId = Math.max(...exercises.map(e => e.id || 0), 0) + 1;
    
    const newExercise = {
      id: newId,
      name,
      description,
      major_group,
      minor_group,
      base_sets,
      base_reps,
      estimated_duration,
      press_pull,
      category,
      bodyweight,
      user_id: userId,
      is_custom: true,
      created_at: new Date().toISOString()
    };
    
    exercises.push(newExercise);
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
    
    console.log('Custom exercise created successfully');
    return newId;
  } catch (error) {
    console.error('Error creating custom exercise:', error);
    throw error;
  }
};

// Update a custom exercise
export const updateCustomExercise = async (exerciseId, exerciseData) => {
  try {
    const data = await AsyncStorage.getItem(EXERCISES_KEY);
    if (!data) return false;
    
    const exercises = JSON.parse(data);
    const exerciseIndex = exercises.findIndex(e => e.id === exerciseId && e.is_custom === true);
    
    if (exerciseIndex === -1) {
      throw new Error('Exercise not found or not authorized to update');
    }
    
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
    
    exercises[exerciseIndex] = {
      ...exercises[exerciseIndex],
      name,
      description,
      major_group,
      minor_group,
      base_sets,
      base_reps,
      estimated_duration,
      press_pull,
      category,
      bodyweight
    };
    
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
    
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
    const data = await AsyncStorage.getItem(EXERCISES_KEY);
    if (!data) return false;
    
    const exercises = JSON.parse(data);
    const exerciseIndex = exercises.findIndex(e => 
      e.id === exerciseId && e.user_id === userId && e.is_custom === true
    );
    
    if (exerciseIndex === -1) {
      throw new Error('Exercise not found or not authorized to delete');
    }
    
    exercises.splice(exerciseIndex, 1);
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
    
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
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (data) {
      const workouts = JSON.parse(data);
      const filteredWorkouts = workouts.filter(w => w.id !== parseInt(workoutId));
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(filteredWorkouts));
      
      // Also remove the workout exercises
      const WORKOUT_EXERCISES_KEY = `workout_exercises_${workoutId}`;
      await AsyncStorage.removeItem(WORKOUT_EXERCISES_KEY);
      
      console.log('Workout deleted successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
};

// Update a workout in database
export const updateWorkoutInDB = async (workoutId, name, numExercises, duration) => {
  try {
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (data) {
      const workouts = JSON.parse(data);
      const workoutIndex = workouts.findIndex(w => w.id === parseInt(workoutId));
      
      if (workoutIndex !== -1) {
        workouts[workoutIndex] = {
          ...workouts[workoutIndex],
          name,
          num_exercises: numExercises,
          duration
        };
        await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
        console.log('Workout updated successfully');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
};

// Delete exercises from a workout
export const removeExercisesFromWorkout = async (workoutId) => {
  try {
    const WORKOUT_EXERCISES_KEY = `workout_exercises_${workoutId}`;
    await AsyncStorage.removeItem(WORKOUT_EXERCISES_KEY);
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
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (data) {
      return JSON.parse(data).length;
    }
    return 0;
  } catch (error) {
    console.error('Error getting workout count:', error);
    return 0;
  }
};

// Get latest workout
export const getLatestWorkout = async () => {
  try {
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (data) {
      const workouts = JSON.parse(data).sort((a, b) => b.id - a.id);
      return workouts[0] || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting latest workout:', error);
    return null;
  }
};

// Favorites functionality for web (using AsyncStorage)

// Add exercise to favorites
export const addExerciseToFavorites = async (exerciseId, userId = 'default') => {
  try {
    const existingFavorites = await AsyncStorage.getItem(EXERCISE_FAVORITES_KEY);
    let favorites = existingFavorites ? JSON.parse(existingFavorites) : [];
    
    // Check if already favorited
    const exists = favorites.find(fav => fav.user_id === userId && fav.exercise_id === exerciseId);
    if (!exists) {
      favorites.push({
        user_id: userId,
        exercise_id: exerciseId,
        created_at: new Date().toISOString()
      });
      await AsyncStorage.setItem(EXERCISE_FAVORITES_KEY, JSON.stringify(favorites));
    }
    
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
    const existingFavorites = await AsyncStorage.getItem(EXERCISE_FAVORITES_KEY);
    if (existingFavorites) {
      let favorites = JSON.parse(existingFavorites);
      favorites = favorites.filter(fav => !(fav.user_id === userId && fav.exercise_id === exerciseId));
      await AsyncStorage.setItem(EXERCISE_FAVORITES_KEY, JSON.stringify(favorites));
    }
    
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
    const existingFavorites = await AsyncStorage.getItem(EXERCISE_FAVORITES_KEY);
    if (existingFavorites) {
      const favorites = JSON.parse(existingFavorites);
      return favorites.some(fav => fav.user_id === userId && fav.exercise_id === exerciseId);
    }
    return false;
  } catch (error) {
    console.error('Error checking if exercise is favorited:', error);
    return false;
  }
};

// Get user's favorite exercises
export const getUserFavoriteExercises = async (userId = 'default') => {
  try {
    const existingFavorites = await AsyncStorage.getItem(EXERCISE_FAVORITES_KEY);
    const exercisesData = await AsyncStorage.getItem(EXERCISES_KEY);
    
    if (existingFavorites && exercisesData) {
      const favorites = JSON.parse(existingFavorites);
      const exercises = JSON.parse(exercisesData);
      
      const userFavorites = favorites.filter(fav => fav.user_id === userId);
      const favoriteExercises = userFavorites.map(fav => {
        const exercise = exercises.find(ex => ex.id === fav.exercise_id);
        return exercise ? { ...exercise, favorited_at: fav.created_at } : null;
      }).filter(Boolean);
      
      // Sort by most recently favorited
      return favoriteExercises.sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at));
    }
    return [];
  } catch (error) {
    console.error('Error getting user favorite exercises:', error);
    return [];
  }
};

// Clear user stats and regenerate tables (development function)
export const clearUserStats = async (userId) => {
  try {
    console.log('🧹 Starting user stats clear and regeneration...');
    
    // Clear user workouts
    console.log('  - Clearing user workouts...');
    await AsyncStorage.removeItem(USER_WORKOUTS_KEY);
    
    // Clear user exercises
    console.log('  - Clearing user exercises...');
    await AsyncStorage.removeItem(USER_EXERCISES_KEY);
    
    // Reset user stats to defaults
    console.log('  - Resetting user stats...');
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    const userIndex = users.findIndex(user => user.username === userId || user.id === userId);
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        total_workouts: 0,
        total_exercises: 0,
        total_sets: 0,
        tons_lifted: 0.0,
        total_workout_minutes: 0,
        current_streak: 0,
        last_active: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      console.log('✅ User stats reset to defaults');
    } else {
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

// Clear and regenerate exercises table (development function)
export const clearAndRegenerateExercises = async () => {
  try {
    console.log('🏋️ Starting exercise regeneration (Web/AsyncStorage)...');
    
    // Clear favorites and exercises data
    console.log('  - Clearing exercise favorites...');
    await AsyncStorage.removeItem(EXERCISE_FAVORITES_KEY);
    
    console.log('  - Clearing exercises data...');
    await AsyncStorage.removeItem(EXERCISES_KEY);
    
    console.log('  - Clearing system workouts...');
    const existingWorkouts = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (existingWorkouts) {
      const workouts = JSON.parse(existingWorkouts);
      const userWorkouts = workouts.filter(w => w.user !== 'system');
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(userWorkouts));
    }
    
    console.log('✅ Cleared existing exercises and system workouts data');
    
    // Recreate exercises with fresh data
    console.log('  - Loading default exercises...');
    const { INITIAL_EXERCISES } = await import('./tables/createExercisesTable.js');
    
    console.log(`  - Adding ${INITIAL_EXERCISES.length} default exercises...`);
    const exercisesWithIds = INITIAL_EXERCISES.map((exercise, index) => ({
      ...exercise,
      id: index + 1,
      user_id: exercise.user_id || 'system',
      is_custom: exercise.is_custom || false,
      created_at: new Date().toISOString()
    }));
    
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercisesWithIds));
    
    console.log(`✅ Successfully added ${exercisesWithIds.length} exercises`);
    
    // Recreate default system workouts
    console.log('  - Recreating system workouts...');
    try {
      const { CREATE_DEFAULT_WORKOUTS_DATA } = await import('./tables/createWorkoutsTable.js');
      
      const currentWorkouts = await AsyncStorage.getItem(WORKOUTS_KEY);
      const workouts = currentWorkouts ? JSON.parse(currentWorkouts) : [];
      
      // Add system workouts
      const systemWorkouts = CREATE_DEFAULT_WORKOUTS_DATA || [
        { id: 1, name: 'Push Power', num_exercises: 3, duration: 32, user: 'system', order: 1, major_group: 'chest, arms' },
        { id: 2, name: 'Leg Day Builder', num_exercises: 3, duration: 30, user: 'system', order: 2, major_group: 'legs' },
        { id: 3, name: 'Back and Biceps', num_exercises: 3, duration: 28, user: 'system', order: 3, major_group: 'back, arms' }
      ];
      
      const updatedWorkouts = [...workouts, ...systemWorkouts];
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts));
      
      console.log('✅ System workouts recreated');
    } catch (workoutError) {
      console.error('⚠️ Error recreating system workouts:', workoutError);
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
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    // Check if username already exists
    const existingUser = users.find(user => user.username === username && user.is_active);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      total_workouts: 0,
      total_exercises: 0,
      total_workout_minutes: 0,
      current_streak: 0,
      settings: '{}',
      is_active: 1
    };
    
    users.push(newUser);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    console.log('User created successfully');
    return newUser.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    return users
      .filter(user => user.is_active)
      .map(user => ({
        ...user,
        settings: JSON.parse(user.settings || '{}')
      }))
      .sort((a, b) => new Date(b.last_active) - new Date(a.last_active));
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const getCurrentUser = async () => {
  try {
    const users = await getUsers();
    console.log('getCurrentUser - All users:', users);
    const currentUser = users.length > 0 ? users[0] : null;
    console.log('getCurrentUser - Selected user:', currentUser);
    return currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const updateUserStats = async (userId, statsUpdate) => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      console.error('User not found');
      return false;
    }
    
    const user = users[userIndex];
    
    if (statsUpdate.total_workouts !== undefined) {
      user.total_workouts = statsUpdate.total_workouts;
    }
    if (statsUpdate.total_exercises !== undefined) {
      user.total_exercises = statsUpdate.total_exercises;
    }
    if (statsUpdate.total_workout_minutes !== undefined) {
      user.total_workout_minutes = statsUpdate.total_workout_minutes;
    }
    if (statsUpdate.current_streak !== undefined) {
      user.current_streak = statsUpdate.current_streak;
    }
    
    user.last_active = new Date().toISOString();
    
    users[userIndex] = user;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    console.log('User stats updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return false;
  }
};

export const updateUserSettings = async (userId, settings) => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      console.error('User not found');
      return false;
    }
    
    users[userIndex].settings = JSON.stringify(settings);
    users[userIndex].last_active = new Date().toISOString();
    
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    console.log('User settings updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return false;
  }
};

export const deleteUser = async (userId) => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      console.error('User not found');
      return false;
    }
    
    users[userIndex].is_active = 0;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
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
  try {
    const {
      setsCompleted,
      weightPerSet, // array of weights
      difficultyPerSet, // array of difficulty ratings
      repsPerSet, // array of reps
      comments = '',
      workoutSessionId = null
    } = exerciseData;

    // Get existing user exercises
    const existingUserExercises = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    const userExercises = existingUserExercises ? JSON.parse(existingUserExercises) : [];

    // Create new exercise record
    const newExerciseRecord = {
      id: userExercises.length > 0 ? Math.max(...userExercises.map(ex => ex.id)) + 1 : 1,
      user_id: userId.toString(),
      exercise_id: exerciseId,
      workout_session_id: workoutSessionId,
      sets_completed: setsCompleted,
      weight_per_set: JSON.stringify(weightPerSet),
      difficulty_per_set: JSON.stringify(difficultyPerSet),
      reps_per_set: JSON.stringify(repsPerSet),
      comments: comments,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    userExercises.push(newExerciseRecord);
    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(userExercises));

    // NOTE: Stats are now updated only when workout is completed, not on individual exercises
    console.log('Exercise completed and recorded successfully (stats will update on workout completion)');
    return { success: true, id: newExerciseRecord.id };
  } catch (error) {
    console.error('Error recording completed exercise:', error);
    return { success: false, error: error.message };
  }
};

// Update user exercise statistics
export const updateUserExerciseStats = async (userId, additionalSets, additionalTons) => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    console.log('updateUserExerciseStats called with:', { userId, additionalSets, additionalTons });
    console.log('Current users:', users);
    
    const userIndex = users.findIndex(user => user.username === userId || user.id === userId);
    console.log('User index found:', userIndex);
    
    if (userIndex === -1) {
      console.error('User not found for userId:', userId);
      console.error('Available users:', users.map(u => ({ id: u.id, username: u.username })));
      return false;
    }

    const oldStats = {
      total_sets: users[userIndex].total_sets || 0,
      tons_lifted: users[userIndex].tons_lifted || 0,
      total_exercises: users[userIndex].total_exercises || 0
    };

    users[userIndex].total_sets = oldStats.total_sets + additionalSets;
    users[userIndex].tons_lifted = oldStats.tons_lifted + additionalTons;
    users[userIndex].total_exercises = oldStats.total_exercises + 1;
    users[userIndex].last_active = new Date().toISOString();

    const newStats = {
      total_sets: users[userIndex].total_sets,
      tons_lifted: users[userIndex].tons_lifted,
      total_exercises: users[userIndex].total_exercises
    };

    console.log('Stats updated from:', oldStats, 'to:', newStats);

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    console.log('User exercise statistics updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user exercise stats:', error);
    return false;
  }
};

// Get user exercise history
export const getUserExerciseHistory = async (userId = 'default', limit = 50) => {
  try {
    const existingUserExercises = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    const existingExercises = await AsyncStorage.getItem(EXERCISES_KEY);
    
    if (!existingUserExercises || !existingExercises) {
      return [];
    }

    const userExercises = JSON.parse(existingUserExercises);
    const exercises = JSON.parse(existingExercises);
    
    // Convert userId to string for consistent comparison
    const userIdString = userId.toString();
    
    const userHistory = userExercises
      .filter(ue => ue.user_id.toString() === userIdString)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, limit);

    // Join with exercise details
    return userHistory.map(record => {
      const exercise = exercises.find(ex => ex.id === record.exercise_id);
      return {
        ...record,
        exercise_name: exercise?.name || 'Unknown Exercise',
        major_group: exercise?.major_group || 'Unknown',
        description: exercise?.description || ''
      };
    });
  } catch (error) {
    console.error('Error getting user exercise history:', error);
    return [];
  }
};

// Check if a specific exercise is completed for a user
export const isExerciseCompleted = async (userId = 'default', exerciseId) => {
  try {
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!userExercisesData) return false;
    
    const userExercises = JSON.parse(userExercisesData);
    const completion = userExercises.find(ue => 
      ue.user_id === userId && ue.exercise_id === exerciseId
    );
    
    return !!completion;
  } catch (error) {
    console.error('Error checking if exercise is completed:', error);
    return false;
  }
};

// Get exercise completion details for a user and exercise
export const getExerciseCompletionDetails = async (userId = 'default', exerciseId) => {
  try {
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!userExercisesData) return null;
    
    const userExercises = JSON.parse(userExercisesData);
    const completion = userExercises
      .filter(ue => ue.user_id === userId && ue.exercise_id === exerciseId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    if (completion) {
      // Safe JSON parsing function
      const safeJsonParse = (value, fallback = []) => {
        if (Array.isArray(value)) return value; // Already parsed
        if (!value) return fallback;
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('Failed to parse JSON:', value, error);
          return fallback;
        }
      };
      
      return {
        ...completion,
        weight_per_set: safeJsonParse(completion.weight_per_set, []),
        difficulty_per_set: safeJsonParse(completion.difficulty_per_set, []),
        reps_per_set: safeJsonParse(completion.reps_per_set, [])
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
  try {
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!userExercisesData) return { success: true, rowsAffected: 0 };
    
    const userExercises = JSON.parse(userExercisesData);
    const initialLength = userExercises.length;
    
    // Remove all completions for this user and exercise
    const updatedUserExercises = userExercises.filter(ue => 
      !(ue.user_id === userId && ue.exercise_id === exerciseId)
    );
    
    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(updatedUserExercises));
    
    const rowsAffected = initialLength - updatedUserExercises.length;
    console.log('Exercise completion deleted successfully');
    return { success: true, rowsAffected };
  } catch (error) {
    console.error('Error deleting exercise completion:', error);
    return { success: false, error: error.message };
  }
};

// Delete all exercise completion records from current active workout session
export const deleteActiveWorkoutExerciseCompletions = async (userId = 'default') => {
  try {
    // Get active workout info
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    if (!usersData) {
      console.log('No users found to clean up exercise completions for');
      return { success: true, rowsAffected: 0 };
    }

    const users = JSON.parse(usersData);
    const user = users.find(u => u.username === userId || u.id === userId);
    
    if (!user?.active_workout) {
      console.log('No active workout to clean up exercise completions for');
      return { success: true, rowsAffected: 0 };
    }

    const workoutId = user.active_workout;

    // Get workout exercises
    const workoutExercisesData = await AsyncStorage.getItem(`workout_exercises_${workoutId}`);
    let workoutExerciseIds = [];
    if (workoutExercisesData) {
      const workoutExercises = JSON.parse(workoutExercisesData);
      workoutExerciseIds = workoutExercises.map(ex => ex.exercise_id || ex.id);
    }

    // Get temp exercises from active workout session
    const sessionKey = `active_workout_session_${userId}_${workoutId}`;
    const sessionData = await AsyncStorage.getItem(sessionKey);
    let tempExerciseIds = [];
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (session.temp_exercises) {
          tempExerciseIds = session.temp_exercises.map(ex => ex.id);
        }
      } catch (error) {
        console.log('Could not parse temp exercises:', error);
      }
    }

    // Combine all exercise IDs
    const allExerciseIds = [...workoutExerciseIds, ...tempExerciseIds];

    if (allExerciseIds.length === 0) {
      console.log('No exercises to clean up completions for');
      return { success: true, rowsAffected: 0 };
    }

    // Get and filter user exercises
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!userExercisesData) {
      console.log('No user exercises to clean up');
      return { success: true, rowsAffected: 0 };
    }

    const userExercises = JSON.parse(userExercisesData);
    const initialLength = userExercises.length;

    // Remove all completions for this user and these exercises
    const updatedUserExercises = userExercises.filter(ue => 
      !(ue.user_id === userId && allExerciseIds.includes(ue.exercise_id))
    );

    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(updatedUserExercises));
    
    const rowsAffected = initialLength - updatedUserExercises.length;
    console.log(`Cleaned up ${rowsAffected} exercise completion records for active workout`);
    return { success: true, rowsAffected };
  } catch (error) {
    console.error('Error deleting active workout exercise completions:', error);
    return { success: false, error: error.message };
  }
};

// Delete exercise completion records for a specific workout session ID
export const deleteWorkoutSessionExerciseCompletions = async (userId = 'default', workoutSessionId) => {
  try {
    if (!workoutSessionId) {
      console.log('No workout session ID provided for cleanup');
      return { success: true, rowsAffected: 0 };
    }

    // Get and filter user exercises
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!userExercisesData) {
      console.log('No user exercises to clean up');
      return { success: true, rowsAffected: 0 };
    }

    const userExercises = JSON.parse(userExercisesData);
    const initialLength = userExercises.length;

    // Remove only completions that match the specific workout session ID
    const updatedUserExercises = userExercises.filter(ue => 
      !(ue.user_id === userId && ue.workout_session_id === workoutSessionId)
    );

    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(updatedUserExercises));
    
    const rowsAffected = initialLength - updatedUserExercises.length;
    console.log(`Cleaned up ${rowsAffected} exercise completion records for session ${workoutSessionId}`);
    return { success: true, rowsAffected };
  } catch (error) {
    console.error('Error deleting workout session exercise completions:', error);
    return { success: false, error: error.message };
  }
};

// Update exercise session IDs to use the workout completion record ID
export const updateExerciseSessionIds = async (userId, oldSessionId, newSessionId) => {
  try {
    console.log(`Updating exercise session IDs from ${oldSessionId} to ${newSessionId} for user ${userId}`);
    
    // Get user exercises
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    if (!userExercisesData) {
      console.log('No user exercises found to update');
      return { success: true, changes: 0 };
    }

    const userExercises = JSON.parse(userExercisesData);
    let changes = 0;

    // Update session IDs for matching exercises
    const updatedUserExercises = userExercises.map(ue => {
      if (ue.user_id === userId && ue.workout_session_id === oldSessionId) {
        changes++;
        return { ...ue, workout_session_id: newSessionId };
      }
      return ue;
    });

    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(updatedUserExercises));
    
    console.log(`Updated ${changes} exercise session IDs`);
    return { success: true, changes };
  } catch (error) {
    console.error('Error updating exercise session IDs:', error);
    return { success: false, error: error.message };
  }
};

// Get user exercise statistics
export const getUserExerciseStats = async (userId = 'default') => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    const user = users.find(user => user.username === userId || user.id === userId);
    
    if (!user) {
      return {
        totalSets: 0,
        tonsLifted: 0,
        totalExercises: 0,
        recentExercises: []
      };
    }

    const recentExercises = await getUserExerciseHistory(userId, 10);

    return {
      totalSets: user.total_sets || 0,
      tonsLifted: user.tons_lifted || 0,
      totalExercises: user.total_exercises || 0,
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

// Debug function to check current users
export const debugUsers = async () => {
  try {
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    console.log('Raw users data from AsyncStorage:', existingUsers);
    
    if (existingUsers) {
      const users = JSON.parse(existingUsers);
      console.log('Parsed users:', users);
      console.log('Number of users:', users.length);
      users.forEach((user, index) => {
        console.log(`User ${index}:`, {
          id: user.id,
          username: user.username,
          total_sets: user.total_sets,
          total_exercises: user.total_exercises,
          tons_lifted: user.tons_lifted
        });
      });
      return users;
    } else {
      console.log('No users found in AsyncStorage');
      return [];
    }
  } catch (error) {
    console.error('Error debugging users:', error);
    return [];
  }
};

// Debug function to display user exercises data
export const debugUserExercises = async () => {
  try {
    const existingUserExercises = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    console.log('Raw user exercises data from AsyncStorage:', existingUserExercises);
    
    if (existingUserExercises) {
      const userExercises = JSON.parse(existingUserExercises);
      console.log('=== USER EXERCISES DEBUG ===');
      console.log('Number of user exercise records:', userExercises.length);
      userExercises.forEach((exercise, index) => {
        console.log(`Exercise record ${index}:`, exercise);
      });
      console.log('========================');
      return userExercises;
    } else {
      console.log('No user exercises found in AsyncStorage');
      return [];
    }
  } catch (error) {
    console.error('Error debugging user exercises:', error);
    return [];
  }
};

// Debug function to check current user workouts
export const debugUserWorkouts = async () => {
  try {
    const existingUserWorkouts = await AsyncStorage.getItem(USER_WORKOUTS_KEY);
    console.log('Raw user workouts data from AsyncStorage:', existingUserWorkouts);
    
    if (existingUserWorkouts) {
      const userWorkouts = JSON.parse(existingUserWorkouts);
      console.log('Parsed user workouts:', userWorkouts);
      console.log('Number of user workout records:', userWorkouts.length);
      userWorkouts.forEach((workout, index) => {
        console.log(`Workout record ${index}:`, {
          id: workout.id,
          user_id: workout.user_id,
          workout_id: workout.workout_id,
          workout_name: workout.workout_name,
          duration: workout.duration,
          comments: workout.comments,
          completed_at: workout.completed_at
        });
      });
      return userWorkouts;
    } else {
      console.log('No user workouts found in AsyncStorage');
      return [];
    }
  } catch (error) {
    console.error('Error debugging user workouts:', error);
    return [];
  }
};

// User Workout Management Functions
export const recordCompletedWorkout = async (userId, workoutId, workoutName, duration, comments, customDate, sessionGuid) => {
  try {
    console.log('Recording completed workout:', { userId, workoutId, workoutName, duration, comments, customDate, sessionGuid });
    
    const existingUserWorkouts = await AsyncStorage.getItem(USER_WORKOUTS_KEY);
    const userWorkouts = existingUserWorkouts ? JSON.parse(existingUserWorkouts) : [];
    
    // Determine the completion date
    const completionDate = customDate || new Date().toISOString();
    console.log(`Added ${workoutName} workout for ${customDate ? 'selected date' : 'today'}: ${completionDate}`);
    const finalSessionGuid = sessionGuid || null;
    
    // Create new workout completion record
    const newWorkoutRecord = {
      id: Date.now(), // Simple ID generation
      user_id: userId.toString(),
      workout_id: workoutId,
      workout_name: workoutName,
      duration: duration,
      comments: comments || '',
      session_guid: finalSessionGuid,
      completed_at: completionDate
    };
    
    userWorkouts.push(newWorkoutRecord);
    await AsyncStorage.setItem(USER_WORKOUTS_KEY, JSON.stringify(userWorkouts));
    
    // Recalculate ALL user stats from database tables
    console.log('Recalculating user stats from database tables...');
    await recalculateUserStatsFromTables(userId);
    
    console.log('Workout completion recorded successfully');
    return { success: true, id: newWorkoutRecord.id };
  } catch (error) {
    console.error('Error recording completed workout:', error);
    return { success: false, error: error.message };
  }
};

// Delete workout completion and associated exercise completions by session GUID
export const deleteWorkoutBySessionGuid = async (userId, sessionGuid) => {
  try {
    console.log(`Deleting workout and exercises for session GUID: ${sessionGuid}`);
    const normalizedUserId = userId.toString();
    
    // Delete exercise completions for this session
    const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
    let exerciseRowsDeleted = 0;
    
    if (userExercisesData) {
      const userExercises = JSON.parse(userExercisesData);
      const initialLength = userExercises.length;
      
      const filteredExercises = userExercises.filter(exercise => 
        !(exercise.user_id?.toString() === normalizedUserId && exercise.workout_session_id === sessionGuid)
      );
      
      exerciseRowsDeleted = initialLength - filteredExercises.length;
      await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(filteredExercises));
    }
    
    // Delete the workout completion
    const userWorkoutsData = await AsyncStorage.getItem(USER_WORKOUTS_KEY);
    let workoutRowsDeleted = 0;
    
    if (userWorkoutsData) {
      const userWorkouts = JSON.parse(userWorkoutsData);
      const initialLength = userWorkouts.length;
      
      const filteredWorkouts = userWorkouts.filter(workout => 
        !(workout.user_id?.toString() === normalizedUserId && workout.session_guid === sessionGuid)
      );
      
      workoutRowsDeleted = initialLength - filteredWorkouts.length;
      await AsyncStorage.setItem(USER_WORKOUTS_KEY, JSON.stringify(filteredWorkouts));
    }
    
    console.log(`Deleted ${exerciseRowsDeleted} exercise completions and ${workoutRowsDeleted} workout completion for session ${sessionGuid}`);
    
    return { 
      success: true, 
      exerciseRowsAffected: exerciseRowsDeleted,
      workoutRowsAffected: workoutRowsDeleted 
    };
  } catch (error) {
    console.error('Error deleting workout by session GUID:', error);
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

// Recalculate user stats purely from database tables
export const recalculateUserStatsFromTables = async (userId) => {
  try {
    console.log('Recalculating stats for user:', userId);
    
    // Get all user workouts
    const userWorkouts = await getUserWorkoutHistory(userId, 1000);
    
    // Get all user exercises  
    const userExercises = await getUserExerciseHistory(userId, 1000);
    
    // Calculate stats from tables
    const totalWorkouts = userWorkouts.length;
    const totalExercises = userExercises.length;
    const totalWorkoutMinutes = userWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
    
    // Calculate weekly streak
    const currentStreak = calculateWeeklyStreak(userWorkouts);
    
    let totalSets = 0;
    let totalTons = 0;
    
    userExercises.forEach(exercise => {
      totalSets += exercise.sets_completed || 0;
      
      // Calculate tons for this exercise
      let exerciseWeight = 0;
      const weightPerSet = Array.isArray(exercise.weight_per_set) ? exercise.weight_per_set : JSON.parse(exercise.weight_per_set || '[]');
      const repsPerSet = Array.isArray(exercise.reps_per_set) ? exercise.reps_per_set : JSON.parse(exercise.reps_per_set || '[]');
      
      for (let i = 0; i < exercise.sets_completed; i++) {
        const weight = weightPerSet[i] || 0;
        const reps = repsPerSet[i] || 0;
        exerciseWeight += weight * reps;
      }
      totalTons += exerciseWeight / 2000; // Convert to tons
    });
    
    console.log('Calculated stats from tables:', {
      totalWorkouts,
      totalExercises, 
      totalSets,
      totalTons: totalTons.toFixed(3),
      totalWorkoutMinutes,
      currentStreak
    });
    
    // Update user record with calculated stats
    const existingUsers = await AsyncStorage.getItem(USERS_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    // Convert userId to string for consistent comparison
    const userIdString = userId.toString();
    const userIndex = users.findIndex(user => 
      user.username === userIdString || user.id.toString() === userIdString
    );
    if (userIndex !== -1) {
      users[userIndex].total_workouts = totalWorkouts;
      users[userIndex].total_exercises = totalExercises;
      users[userIndex].total_sets = totalSets;
      users[userIndex].tons_lifted = totalTons;
      users[userIndex].total_workout_minutes = totalWorkoutMinutes;
      users[userIndex].current_streak = currentStreak;
      users[userIndex].last_active = new Date().toISOString();
      
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      console.log('Updated user stats from table calculations');
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
    } else {
      console.error('User not found for stats update:', userId);
      return { success: false };
    }
  } catch (error) {
    console.error('Error recalculating user stats:', error);
    return { success: false };
  }
};

export const getUserWorkoutHistory = async (userId, limit = 50) => {
  try {
    const existingUserWorkouts = await AsyncStorage.getItem(USER_WORKOUTS_KEY);
    const userWorkouts = existingUserWorkouts ? JSON.parse(existingUserWorkouts) : [];
    
    // Convert userId to string for consistent comparison
    const userIdString = userId.toString();
    
    // Filter by user and limit results
    const userSpecificWorkouts = userWorkouts
      .filter(workout => workout.user_id.toString() === userIdString)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, limit);
      
    return userSpecificWorkouts;
  } catch (error) {
    console.error('Error getting user workout history:', error);
    return [];
  }
};

export const deleteWorkoutCompletion = async (userId, workoutRecordId) => {
  try {
    const existingUserWorkouts = await AsyncStorage.getItem(USER_WORKOUTS_KEY);
    const userWorkouts = existingUserWorkouts ? JSON.parse(existingUserWorkouts) : [];
    
    // Convert userId to string for consistent comparison
    const userIdString = userId.toString();
    
    // Find the workout record to get details before deletion
    const workoutToDelete = userWorkouts.find(workout => 
      workout.id === workoutRecordId && workout.user_id.toString() === userIdString
    );

    if (!workoutToDelete) {
      console.log('Workout record not found for cleanup');
      return { success: false, error: 'Workout record not found' };
    }

    if (workoutToDelete.session_guid) {
      console.log(`Redirecting deletion to session GUID cleanup for workout ${workoutRecordId}`);
      return await deleteWorkoutBySessionGuid(userIdString, workoutToDelete.session_guid);
    }

    const workoutId = workoutToDelete.workout_id;
    const completedAt = workoutToDelete.completed_at;

    // Get workout exercises to know which exercises to clean up
    let workoutExerciseIds = [];
    const workoutExercisesData = await AsyncStorage.getItem(`workout_exercises_${workoutId}`);
    if (workoutExercisesData) {
      const workoutExercises = JSON.parse(workoutExercisesData);
      workoutExerciseIds = workoutExercises.map(ex => ex.exercise_id || ex.id);
    }

    // Remove the specific workout record
    const filteredWorkouts = userWorkouts.filter(workout => 
      !(workout.id === workoutRecordId && workout.user_id.toString() === userIdString)
    );

    await AsyncStorage.setItem(USER_WORKOUTS_KEY, JSON.stringify(filteredWorkouts));

    // Clean up exercise completions that were recorded around the same time as this workout
    if (workoutExerciseIds.length > 0 && completedAt) {
      const userExercisesData = await AsyncStorage.getItem(USER_EXERCISES_KEY);
      if (userExercisesData) {
        const userExercises = JSON.parse(userExercisesData);
        const completedDate = new Date(completedAt);
        
        // Create a time window of 6 hours around the workout completion
        const startTime = new Date(completedDate.getTime() - 3 * 60 * 60 * 1000); // 3 hours before
        const endTime = new Date(completedDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after
        
        const initialLength = userExercises.length;
        
        // Filter out exercise completions that match this workout
        const filteredUserExercises = userExercises.filter(ue => {
          if (ue.user_id.toString() !== userIdString) return true;
          if (!workoutExerciseIds.includes(ue.exercise_id)) return true;
          
          const exerciseDate = new Date(ue.completed_at);
          return exerciseDate < startTime || exerciseDate > endTime;
        });

        await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(filteredUserExercises));
        
        const cleanedUp = initialLength - filteredUserExercises.length;
        console.log(`Cleaned up ${cleanedUp} exercise completion records for workout ${workoutRecordId}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting workout completion:', error);
    return { success: false, error: error.message };
  }
};

// Active workout management functions
export const setActiveWorkout = async (userId = 'default', workoutId) => {
  try {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    if (!usersData) return { success: false, error: 'No users found' };
    
    const users = JSON.parse(usersData);
    const userIndex = users.findIndex(u => u.username === userId || u.id === userId);
    
    if (userIndex === -1) return { success: false, error: 'User not found' };
    
    users[userIndex].active_workout = workoutId;
    users[userIndex].last_active = new Date().toISOString();
    
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    console.log(`Set active workout ${workoutId} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting active workout:', error);
    return { success: false, error: error.message };
  }
};

// Active workout session management functions
export const saveActiveWorkoutSession = async (userId = 'default', workoutId, exerciseStates, tempExercises = [], sessionGuid = null) => {
  try {
    const sessionsData = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSIONS_KEY);
    const sessions = sessionsData ? JSON.parse(sessionsData) : {};
    
    const sessionKey = `${userId}_${workoutId}`;
    sessions[sessionKey] = {
      userId,
      workoutId,
      exerciseStates,
      tempExercises,
      sessionGuid,
      lastUpdated: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(ACTIVE_WORKOUT_SESSIONS_KEY, JSON.stringify(sessions));
    console.log(`Saved workout session for user ${userId}, workout ${workoutId}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving active workout session:', error);
    return { success: false, error: error.message };
  }
};

export const getActiveWorkoutSession = async (userId = 'default', workoutId) => {
  try {
    const sessionsData = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSIONS_KEY);
    if (!sessionsData) return null;
    
    const sessions = JSON.parse(sessionsData);
    const sessionKey = `${userId}_${workoutId}`;
    const session = sessions[sessionKey];
    if (!session) return null;

    return {
      ...session,
      sessionGuid: session.sessionGuid || null
    };
  } catch (error) {
    console.error('Error getting active workout session:', error);
    return null;
  }
};

export const clearActiveWorkoutSession = async (userId = 'default', workoutId) => {
  try {
    const sessionsData = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSIONS_KEY);
    if (!sessionsData) return { success: true };
    
    const sessions = JSON.parse(sessionsData);
    const sessionKey = `${userId}_${workoutId}`;
    
    delete sessions[sessionKey];
    
    await AsyncStorage.setItem(ACTIVE_WORKOUT_SESSIONS_KEY, JSON.stringify(sessions));
    console.log(`Cleared workout session for user ${userId}, workout ${workoutId}`);
    return { success: true };
  } catch (error) {
    console.error('Error clearing active workout session:', error);
    return { success: false, error: error.message };
  }
};

export const clearActiveWorkout = async (userId = 'default') => {
  try {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    if (!usersData) return { success: false, error: 'No users found' };
    
    const users = JSON.parse(usersData);
    const userIndex = users.findIndex(u => u.username === userId || u.id === userId);
    
    if (userIndex === -1) return { success: false, error: 'User not found' };
    
    const activeWorkoutId = users[userIndex].active_workout;
    
    // Clear the active workout ID
    users[userIndex].active_workout = null;
    users[userIndex].last_active = new Date().toISOString();
    
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Also clear the workout session data if there was an active workout
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

export const getActiveWorkout = async (userId = 'default') => {
  try {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    if (!usersData) return null;
    
    const users = JSON.parse(usersData);
    const user = users.find(u => u.username === userId || u.id === userId);
    
    if (!user) return null;
    
    return user.active_workout;
  } catch (error) {
    console.error('Error getting active workout:', error);
    return null;
  }
};

// Clear all user data and regenerate initial state
export const clearAllUserData = async () => {
  try {
    console.log('🧹 Clearing all user data (Web/AsyncStorage)...');
    
    // Clear user exercises
    console.log('  - Clearing user exercises...');
    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify([]));
    
    // Clear user workouts  
    console.log('  - Clearing user workouts...');
    await AsyncStorage.setItem(USER_WORKOUTS_KEY, JSON.stringify([]));
    
    // Clear user measurements
    console.log('  - Clearing user measurements...');
    await AsyncStorage.setItem(USER_MEASUREMENTS_KEY, JSON.stringify([]));
    
    // Clear users (this will remove all usernames)
    console.log('  - Clearing all users (including usernames)...');
    await AsyncStorage.removeItem(USERS_KEY);
    
    // Clear favorites
    console.log('  - Clearing exercise favorites...');
    await AsyncStorage.setItem(EXERCISE_FAVORITES_KEY, JSON.stringify([]));
    
    // Clear user-created workouts but keep system workouts
    console.log('  - Clearing user-created workouts...');
    const existingWorkouts = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (existingWorkouts) {
      const workouts = JSON.parse(existingWorkouts);
      const systemWorkouts = workouts.filter(w => w.user === 'system');
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(systemWorkouts));
    }
    
    // Clear active workout sessions
    console.log('  - Clearing active workout sessions...');
    await AsyncStorage.setItem(ACTIVE_WORKOUT_SESSIONS_KEY, JSON.stringify({}));
    
    console.log('✅ All user data cleared');
    
    // Ensure system workouts exist
    console.log('  - Checking system workouts...');
    const currentWorkouts = await AsyncStorage.getItem(WORKOUTS_KEY);
    const workouts = currentWorkouts ? JSON.parse(currentWorkouts) : [];
    const systemWorkoutCount = workouts.filter(w => w.user === 'system').length;
    
    if (systemWorkoutCount === 0) {
      console.log('  - Recreating system workouts...');
      const systemWorkouts = [
        { id: 1, name: 'Push Power', num_exercises: 3, duration: 32, user: 'system', order: 1, major_group: 'chest, arms' },
        { id: 2, name: 'Leg Day Builder', num_exercises: 3, duration: 30, user: 'system', order: 2, major_group: 'legs' },
        { id: 3, name: 'Back and Biceps', num_exercises: 3, duration: 28, user: 'system', order: 3, major_group: 'back, arms' }
      ];
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(systemWorkouts));
      console.log('✅ System workouts recreated');
    }
    
    console.log('🎉 All user data cleared and system data regenerated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error clearing user data:', error);
    return { success: false, error: error.message };
  }
};

// Measurement storage key
const USER_MEASUREMENTS_KEY = 'user_measurements';

// Record a new user measurement
export const recordUserMeasurement = async (userId, weight, bodyFatPercentage, customDate = null) => {
  try {
    const measurements = await AsyncStorage.getItem(USER_MEASUREMENTS_KEY);
    const measurementList = measurements ? JSON.parse(measurements) : [];
    
    // Use custom date if provided, otherwise use current date
    const recordedAt = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
    
    const newMeasurement = {
      id: measurementList.length + 1,
      user_id: userId.toString(),
      weight_lbs: weight,
      body_fat_percentage: bodyFatPercentage || null,
      recorded_at: recordedAt
    };
    
    measurementList.push(newMeasurement);
    await AsyncStorage.setItem(USER_MEASUREMENTS_KEY, JSON.stringify(measurementList));
    
    console.log('Measurement recorded:', newMeasurement);
    return newMeasurement;
  } catch (error) {
    console.error('Error recording measurement:', error);
    throw error;
  }
};

// Get user measurement history
export const getUserMeasurementHistory = async (userId, limit = 100) => {
  try {
    const measurements = await AsyncStorage.getItem(USER_MEASUREMENTS_KEY);
    const measurementList = measurements ? JSON.parse(measurements) : [];
    
    // Convert userId to string for consistent comparison
    const userIdString = userId.toString();

    return measurementList
      .filter(m => m.user_id.toString() === userIdString)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting measurement history:', error);
    throw error;
  }
};

// Get latest user measurement
export const getLatestUserMeasurement = async (userId) => {
  try {
    const measurements = await AsyncStorage.getItem(USER_MEASUREMENTS_KEY);
    const measurementList = measurements ? JSON.parse(measurements) : [];
    
    const userMeasurements = measurementList
      .filter(m => m.user_id === userId)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    
    return userMeasurements.length > 0 ? userMeasurements[0] : null;
  } catch (error) {
    console.error('Error getting latest measurement:', error);
    throw error;
  }
};

// Delete a user measurement
export const deleteUserMeasurement = async (userId, measurementId) => {
  try {
    const measurements = await AsyncStorage.getItem(USER_MEASUREMENTS_KEY);
    const measurementList = measurements ? JSON.parse(measurements) : [];
    
    const updatedMeasurements = measurementList.filter(
      m => !(m.user_id === userId && m.id === measurementId)
    );
    
    await AsyncStorage.setItem(USER_MEASUREMENTS_KEY, JSON.stringify(updatedMeasurements));
    console.log(`Measurement ${measurementId} deleted for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error deleting measurement:', error);
    throw error;
  }
};