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
export const getArchivedWorkoutsFromDB = databaseImpl.getArchivedWorkoutsFromDB;
export const getWorkoutWithExercises = databaseImpl.getWorkoutWithExercises;
export const addWorkoutToDB = databaseImpl.addWorkoutToDB;
export const addExercisesToWorkout = databaseImpl.addExercisesToWorkout;
export const getAllExercises = databaseImpl.getAllExercises;
export const deleteWorkoutFromDB = databaseImpl.deleteWorkoutFromDB;
export const updateWorkoutInDB = databaseImpl.updateWorkoutInDB;
export const updateWorkoutOrder = databaseImpl.updateWorkoutOrder;
export const archiveWorkout = databaseImpl.archiveWorkout;
export const restoreWorkout = databaseImpl.restoreWorkout;
export const moveWorkoutToDate = databaseImpl.moveWorkoutToDate;
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
export const isExerciseCompleted = databaseImpl.isExerciseCompleted;
export const getExerciseCompletionDetails = databaseImpl.getExerciseCompletionDetails;
export const deleteExerciseCompletion = databaseImpl.deleteExerciseCompletion;
export const deleteActiveWorkoutExerciseCompletions = databaseImpl.deleteActiveWorkoutExerciseCompletions;
export const deleteWorkoutSessionExerciseCompletions = databaseImpl.deleteWorkoutSessionExerciseCompletions;
export const updateExerciseSessionIds = databaseImpl.updateExerciseSessionIds;
export const deleteWorkoutBySessionGuid = databaseImpl.deleteWorkoutBySessionGuid;
export const deleteWorkoutCompletion = databaseImpl.deleteWorkoutCompletion;
export const getUserWorkoutHistory = databaseImpl.getUserWorkoutHistory;
export const debugUsers = databaseImpl.debugUsers;
export const debugUserExercises = databaseImpl.debugUserExercises;
export const debugUserWorkouts = databaseImpl.debugUserWorkouts;
export const recordCompletedWorkout = databaseImpl.recordCompletedWorkout;
export const setActiveWorkout = databaseImpl.setActiveWorkout;
export const clearActiveWorkout = databaseImpl.clearActiveWorkout;
export const getActiveWorkout = databaseImpl.getActiveWorkout;
export const saveActiveWorkoutSession = databaseImpl.saveActiveWorkoutSession;
export const getActiveWorkoutSession = databaseImpl.getActiveWorkoutSession;
export const clearActiveWorkoutSession = databaseImpl.clearActiveWorkoutSession;
export const clearAllUserData = databaseImpl.clearAllUserData;
export const clearUserStats = databaseImpl.clearUserStats;
export const recalculateUserStatsFromTables = databaseImpl.recalculateUserStatsFromTables;
export const repairSystemWorkouts = databaseImpl.repairSystemWorkouts;
export const forceRecreateSystemWorkouts = databaseImpl.forceRecreateSystemWorkouts;

// Custom user exercise functions
export const getUserCustomExercises = databaseImpl.getUserCustomExercises;
export const createCustomExercise = databaseImpl.createCustomExercise;
export const updateCustomExercise = databaseImpl.updateCustomExercise;
export const deleteCustomExercise = databaseImpl.deleteCustomExercise;
export const recordUserMeasurement = databaseImpl.recordUserMeasurement;
export const getUserMeasurementHistory = databaseImpl.getUserMeasurementHistory;
export const getLatestUserMeasurement = databaseImpl.getLatestUserMeasurement;
export const deleteUserMeasurement = databaseImpl.deleteUserMeasurement;

// Data Export functions
export const exportWorkoutsToCSV = databaseImpl.exportWorkoutsToCSV;
export const exportUserDataToCSV = databaseImpl.exportUserDataToCSV;