// Platform-specific database implementation
// This file exports the appropriate database functions based on the platform

import { Platform } from 'react-native';

// Import platform-specific implementations
let databaseImpl;

if (Platform.OS === 'web') {
  databaseImpl = require('./database.web.js');
} else {
  databaseImpl = require('./database.native.js');
}

// Re-export all functions from the platform-specific implementation
export const initDatabase = databaseImpl.initDatabase;
export const getWorkoutsFromDB = databaseImpl.getWorkoutsFromDB;
export const getWorkoutWithExercises = databaseImpl.getWorkoutWithExercises;
export const addWorkoutToDB = databaseImpl.addWorkoutToDB;
export const addExercisesToWorkout = databaseImpl.addExercisesToWorkout;
export const getAllExercises = databaseImpl.getAllExercises;
export const deleteWorkoutFromDB = databaseImpl.deleteWorkoutFromDB;
export const updateWorkoutInDB = databaseImpl.updateWorkoutInDB;
export const removeExercisesFromWorkout = databaseImpl.removeExercisesFromWorkout;
export const getWorkoutCount = databaseImpl.getWorkoutCount;
export const getLatestWorkout = databaseImpl.getLatestWorkout;
export const addExerciseToFavorites = databaseImpl.addExerciseToFavorites;
export const removeExerciseFromFavorites = databaseImpl.removeExerciseFromFavorites;
export const isExerciseFavorited = databaseImpl.isExerciseFavorited;
export const getUserFavoriteExercises = databaseImpl.getUserFavoriteExercises;
export const clearAndRegenerateExercises = databaseImpl.clearAndRegenerateExercises;
export const createUser = databaseImpl.createUser;
export const getUsers = databaseImpl.getUsers;
export const getCurrentUser = databaseImpl.getCurrentUser;
export const updateUserStats = databaseImpl.updateUserStats;
export const updateUserSettings = databaseImpl.updateUserSettings;
export const deleteUser = databaseImpl.deleteUser;
export const recordCompletedExercise = databaseImpl.recordCompletedExercise;
export const updateUserExerciseStats = databaseImpl.updateUserExerciseStats;
export const getUserExerciseHistory = databaseImpl.getUserExerciseHistory;
export const getUserExerciseStats = databaseImpl.getUserExerciseStats;