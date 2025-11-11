// Web-specific database implementation using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKOUTS_KEY = 'workouts';
const EXERCISES_KEY = 'exercises';
const USERS_KEY = 'users';
const USER_SESSIONS_KEY = 'user_sessions';
const EXERCISE_FAVORITES_KEY = 'exercise_favorites';
const USER_EXERCISES_KEY = 'user_exercises';

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
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
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
        workoutExercises = exercises.filter(e => ['Incline Dumbbell Bench', 'Flat Barbell Bench', 'Tricep Extension'].includes(e.name));
      } else if (workout.name === 'Leg Day Builder') {
        workoutExercises = exercises.filter(e => ['Squat', 'Leg Press', 'Calf Raise'].includes(e.name));
      } else if (workout.name === 'Back and Biceps') {
        workoutExercises = exercises.filter(e => ['Pullup', 'Seated Row', 'Bicep Curl'].includes(e.name));
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

// Get all exercises from database
export const getAllExercises = async () => {
  try {
    const data = await AsyncStorage.getItem(EXERCISES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error fetching all exercises:', error);
    return [];
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

// Clear and regenerate exercises table (development function)
export const clearAndRegenerateExercises = async () => {
  try {
    console.log('🏋️ Starting exercise regeneration (Web/AsyncStorage)...');
    
    // Clear favorites and exercises data
    console.log('  - Clearing exercise favorites...');
    await AsyncStorage.removeItem(EXERCISE_FAVORITES_KEY);
    
    console.log('  - Clearing exercises data...');
    await AsyncStorage.removeItem(EXERCISES_KEY);
    
    console.log('✅ Cleared existing exercises data');
    
    // Recreate exercises with fresh data
    console.log('  - Loading default exercises...');
    const { INITIAL_EXERCISES } = await import('./tables/createExercisesTable.js');
    
    console.log(`  - Adding ${INITIAL_EXERCISES.length} default exercises...`);
    const exercisesWithIds = INITIAL_EXERCISES.map((exercise, index) => ({
      ...exercise,
      id: index + 1
    }));
    
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercisesWithIds));
    
    console.log(`✅ Successfully added ${exercisesWithIds.length} exercises`);
    console.log('🎉 Exercise table regeneration completed successfully!');
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
      longest_streak: 0,
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
    return users.length > 0 ? users[0] : null;
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
    if (statsUpdate.longest_streak !== undefined) {
      user.longest_streak = statsUpdate.longest_streak;
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
      user_id: userId,
      exercise_id: exerciseId,
      workout_session_id: workoutSessionId,
      sets_completed: setsCompleted,
      weight_per_set: weightPerSet,
      difficulty_per_set: difficultyPerSet,
      reps_per_set: repsPerSet,
      comments: comments,
      completed_at: new Date().toISOString()
    };

    userExercises.push(newExerciseRecord);
    await AsyncStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(userExercises));

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
    
    const userIndex = users.findIndex(user => user.username === userId || user.id === userId);
    if (userIndex === -1) {
      console.error('User not found');
      return false;
    }

    users[userIndex].total_sets = (users[userIndex].total_sets || 0) + additionalSets;
    users[userIndex].tons_lifted = (users[userIndex].tons_lifted || 0) + additionalTons;
    users[userIndex].total_exercises = (users[userIndex].total_exercises || 0) + 1;
    users[userIndex].last_active = new Date().toISOString();

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    console.log('User exercise statistics updated');
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
    
    const userHistory = userExercises
      .filter(ue => ue.user_id === userId)
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