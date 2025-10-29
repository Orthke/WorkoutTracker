import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'workouts';

// Get all workouts from storage
export async function getWorkouts() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
}

// Save a new workout
export async function saveWorkout(workout) {
  try {
    const workouts = await getWorkouts();
    workouts.unshift(workout); // Add to top
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch (e) {
    // Handle error
  }
}
