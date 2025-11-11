import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'workouts';
const COMPLETED_WORKOUTS_KEY = 'completed_workouts';

// Get all workouts from storage
export async function getWorkouts() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (_e) {
    return [];
  }
}

// Save a new workout
export async function saveWorkout(workout) {
  try {
    const workouts = await getWorkouts();
    workouts.unshift(workout); // Add to top
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch (_e) {
    // Handle error
  }
}

// Get completed workouts from storage
export async function getCompletedWorkouts() {
  try {
    const json = await AsyncStorage.getItem(COMPLETED_WORKOUTS_KEY);
    return json ? JSON.parse(json) : {};
  } catch (_e) {
    return {};
  }
}

// Mark a workout as completed or uncompleted
export async function toggleWorkoutCompleted(workoutId) {
  try {
    const completedWorkouts = await getCompletedWorkouts();
    if (completedWorkouts[workoutId]) {
      // If already completed, remove it
      delete completedWorkouts[workoutId];
    } else {
      // Mark as completed with current datetime
      completedWorkouts[workoutId] = new Date().toISOString();
    }
    await AsyncStorage.setItem(COMPLETED_WORKOUTS_KEY, JSON.stringify(completedWorkouts));
    return completedWorkouts;
  } catch (_e) {
    return {};
  }
}
