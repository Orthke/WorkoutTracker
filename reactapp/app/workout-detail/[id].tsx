import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  clearActiveWorkout,
  deleteExerciseCompletion,
  deleteWorkoutSessionExerciseCompletions,
  getActiveWorkout,
  getActiveWorkoutSession,
  getAllExercises,
  getCurrentUser,
  getExerciseCompletionDetails,
  getWorkoutWithExercises,
  recordCompletedExercise,
  recordCompletedWorkout,
  saveActiveWorkoutSession,
  setActiveWorkout
} from '../../utils/database';


interface Exercise {
  id: number;
  name: string;
  description?: string;
  major_group: string;
  minor_group?: string;
  base_sets?: number;
  base_reps?: number;
  estimated_duration?: number;
  press_pull?: string;
  category?: string;
  exercise_order?: number;
  bodyweight?: boolean;
  alternates?: Exercise[];
}

interface WorkoutData {
  id: number;
  name: string;
  num_exercises: number;
  duration: number;
  user: string;
  order: number;
  major_group: string;
  exercises: Exercise[];
}

interface SetData {
  weight: number;
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
  completed: boolean;
}

const createDefaultSet = (): SetData => ({
  weight: 50,
  difficulty: null,
  completed: false,
});

const resolveSetsCount = (rawSets?: number | null) => {
  if (typeof rawSets === 'number' && Number.isFinite(rawSets) && rawSets > 0) {
    return rawSets;
  }
  return 3;
};

const buildInitialExerciseState = (rawSets?: number | null) => {
  const count = resolveSetsCount(rawSets);
  return {
    sets: Array.from({ length: count }, () => createDefaultSet()),
    notes: '',
    completed: false,
  };
};

const normalizeDifficulty = (value: any): SetData['difficulty'] => {
  if (typeof value === 'number' && value >= 1 && value <= 5) {
    return value as 1 | 2 | 3 | 4 | 5;
  }
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }
  return null;
};

const normalizeExerciseState = (
  state: any,
  rawSets?: number | null
): { sets: SetData[]; notes: string; completed: boolean; hidden?: boolean } => {
  const baseState = buildInitialExerciseState(rawSets);
  if (!state) {
    return baseState;
  }

  const normalizedSets = Array.isArray(state.sets)
    ? state.sets.map((set: any) => ({
      weight: typeof set?.weight === 'number' && Number.isFinite(set.weight) ? set.weight : 50,
      difficulty: normalizeDifficulty(set?.difficulty),
      completed: !!set?.completed,
    }))
    : baseState.sets;

  // Don't force the length to match base_sets - allow dynamic sets
  // Only ensure we have at least 1 set
  if (normalizedSets.length === 0) {
    normalizedSets.push(createDefaultSet());
  }

  return {
    sets: normalizedSets,
    notes: typeof state.notes === 'string' ? state.notes : '',
    completed: state.completed === true,
    hidden: state.hidden === true,
  };
};

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseStates, setExerciseStates] = useState<{ [key: number]: { sets: SetData[], notes: string, completed?: boolean, hidden?: boolean } }>({});
  // const [tempNotes, setTempNotes] = useState('');
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('default');
  const [workoutActive, setWorkoutActive] = useState(false);
  const [workoutSessionId, setWorkoutSessionId] = useState<string>('');
  const isRestoringSession = useRef(true);

  // Generate a proper GUID for unique workout session identification
  const generateWorkoutGUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const persistWorkoutSession = (states: { [key: number]: { sets: SetData[]; notes: string; completed?: boolean; hidden?: boolean } }, temps: Exercise[], force = false) => {
    if (!workout || !currentUserId || currentUserId === 'default' || isRestoringSession.current || (!workoutActive && !force)) {
      return;
    }

    const sessionGuid = workoutSessionId || generateWorkoutGUID();
    if (!workoutSessionId) {
      setWorkoutSessionId(sessionGuid);
    }

    // @ts-ignore - Fix typing issue with database function
    saveActiveWorkoutSession(currentUserId, workout.id, states, temps, sessionGuid)
      .catch((error: unknown) => console.error('Error saving workout session:', error));
  };

  // Exit workout modal states
  const [exitWorkoutModalVisible, setExitWorkoutModalVisible] = useState(false);

  // Complete workout modal states
  const [completeWorkoutModalVisible, setCompleteWorkoutModalVisible] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutComments, setWorkoutComments] = useState('');
  const [completingWorkout, setCompletingWorkout] = useState(false);

  // Active workout conflict modal states
  const [activeWorkoutConflictModalVisible, setActiveWorkoutConflictModalVisible] = useState(false);
  const [existingActiveWorkout, setExistingActiveWorkout] = useState<WorkoutData | null>(null);
  const [discardingActiveWorkout, setDiscardingActiveWorkout] = useState(false);
  // Temp exercise feature state
  const [tempExercises, setTempExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearchModalVisible, setExerciseSearchModalVisible] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  // Swap alternates state
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [exerciseToSwap, setExerciseToSwap] = useState<Exercise | null>(null);
  const [originalExercises, setOriginalExercises] = useState<{ [key: number]: Exercise }>({});

  // Get last weights for an exercise from previous workouts
  const getLastWeightsForExercise = async (exerciseId: number, workoutId: number): Promise<number[]> => {
    try {
      // Get the most recent completion of this specific exercise
      const completionDetails = await getExerciseCompletionDetails(currentUserId, exerciseId);
      if (completionDetails && completionDetails.weight_per_set) {
        console.log('Found previous weights for exercise', exerciseId, ':', completionDetails.weight_per_set);
        return completionDetails.weight_per_set;
      }
    } catch (error) {
      console.error('Error getting last weights:', error);
    }

    // Default to 50lbs for each set if no previous data found
    const setsCount = workout?.exercises.find(e => e.id === exerciseId)?.base_sets || 3;
    return Array(setsCount).fill(50);
  };

  // Start workout function
  const startWorkout = async () => {
    if (!workout) return;

    setWorkoutActive(true);

    // Generate unique GUID for this workout session
    const sessionGUID = generateWorkoutGUID();
    setWorkoutSessionId(sessionGUID);
    console.log(`Generated workout session GUID: ${sessionGUID}`);

    // Set active workout in database
    try {
      await setActiveWorkout(currentUserId, workout.id);
      persistWorkoutSession(exerciseStates, tempExercises, true);
      console.log(`Started active workout ${workout.id} with session GUID ${sessionGUID} for user ${currentUserId}`);
    } catch (error) {
      console.error('Error setting active workout:', error);
    }
  };

  // Exit and discard workout
  const exitWorkout = () => {
    setExitWorkoutModalVisible(true);
  };

  const confirmExitWorkout = async () => {
    // Clean up exercise completion records for this specific workout session
    try {
      if (workoutSessionId) {
        await deleteWorkoutSessionExerciseCompletions(currentUserId, workoutSessionId);
        console.log(`Cleaned up exercise completions for session ${workoutSessionId}`);
      }
    } catch (error) {
      console.error('Error cleaning up exercise completions:', error);
    }

    // Clear active workout from database
    try {
      await clearActiveWorkout(currentUserId);
      console.log(`Cleared active workout for user ${currentUserId}`);
    } catch (error) {
      console.error('Error clearing active workout:', error);
    }

    // Reset all states using the same logic as workout completion
    resetWorkoutState();
    setExitWorkoutModalVisible(false);

    // Navigate back to workout list
    router.replace('/workout-list');
  };

  // Handle discarding existing active workout to start new one
  const discardActiveWorkoutAndStart = async () => {
    setDiscardingActiveWorkout(true);

    try {
      // Clean up exercise completion records for the existing active workout
      if (workoutSessionId) {
        await deleteWorkoutSessionExerciseCompletions(currentUserId, workoutSessionId);
        console.log(`Cleaned up exercise completions for existing session ${workoutSessionId}`);
      }

      // Clear the existing active workout
      await clearActiveWorkout(currentUserId);
      console.log(`Discarded existing active workout for user ${currentUserId}`);

      // Close the conflict modal
      setActiveWorkoutConflictModalVisible(false);
      setExistingActiveWorkout(null);

      // Start this workout
      await startWorkout();

    } catch (error) {
      console.error('Error discarding active workout:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to discard existing workout',
        visibilityTime: 1000,
      });
    } finally {
      setDiscardingActiveWorkout(false);
    }
  };

  // Go back without starting new workout
  const goBackFromConflict = () => {
    setActiveWorkoutConflictModalVisible(false);
    setExistingActiveWorkout(null);
    router.back();
  };

  // Reset workout state after completion
  const resetWorkoutState = () => {
    isRestoringSession.current = true;
    setWorkoutActive(false);

    // Clear all exercise states - reset checkboxes and data
    const resetStates: { [key: number]: { sets: SetData[]; notes: string; completed?: boolean; hidden?: boolean } } = {};
    const allExercises = [...(workout?.exercises || []), ...tempExercises];

    allExercises.forEach(exercise => {
      resetStates[exercise.id] = buildInitialExerciseState(exercise.base_sets);
    });

    setExerciseStates(resetStates);

    setTempExercises([]);
    setCompleteWorkoutModalVisible(false);
    setWorkoutDuration('');
    setWorkoutComments('');
    isRestoringSession.current = false;
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUserId((user.username || user.id || 'default').toString());
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Check if this workout is already active when component loads
  useEffect(() => {
    const checkActiveWorkout = async () => {
      if (!currentUserId || currentUserId === 'default' || !id) return;

      try {
        const activeWorkoutId = await getActiveWorkout(currentUserId);
        const currentWorkoutId = parseInt(id as string);

        if (activeWorkoutId && activeWorkoutId !== currentWorkoutId) {
          // User has a different active workout - show conflict modal
          try {
            const existingWorkout = await getWorkoutWithExercises(activeWorkoutId);
            setExistingActiveWorkout(existingWorkout);
            setActiveWorkoutConflictModalVisible(true);
            console.log(`Active workout conflict detected: ${activeWorkoutId} vs ${currentWorkoutId}`);
          } catch (error) {
            console.error('Error loading existing active workout:', error);
            // Fallback to redirect if we can't load the workout details
            router.replace(`/workout-detail/${activeWorkoutId}` as any);
          }
          return;
        } else if (activeWorkoutId && activeWorkoutId === currentWorkoutId) {
          // This workout is already active - set state accordingly
          setWorkoutActive(true);
          console.log(`Resumed active workout ${activeWorkoutId} for user ${currentUserId}`);
        }
      } catch (error) {
        console.error('Error checking active workout:', error);
      }
    };

    checkActiveWorkout();
  }, [currentUserId, id, router]);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const user = await getCurrentUser();
        const userId = user?.username || 'default';
        const list = await getAllExercises(userId);
        setAllExercises(list);
      } catch (error) {
        console.error('Error loading all exercises:', error);
      }
    };
    loadExercises();
  }, []);

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        setLoading(true);
        isRestoringSession.current = true;

        const workoutId = parseInt(id as string);
        const workoutData = await getWorkoutWithExercises(workoutId);
        setWorkout(workoutData);

        let initialStates: { [key: number]: { sets: SetData[]; notes: string; completed?: boolean; hidden?: boolean } } = {};
        let initialTempExercises: Exercise[] = [];

        if (workoutData?.exercises) {
          const savedSession = await getActiveWorkoutSession(currentUserId, workoutId);

          if (savedSession && savedSession.exerciseStates) {
            const savedStates = savedSession.exerciseStates;
            const savedTemps = Array.isArray(savedSession.tempExercises) ? savedSession.tempExercises : [];
            const normalizedStates: { [key: number]: { sets: SetData[]; notes: string; completed?: boolean; hidden?: boolean } } = {};

            const exerciseLookup = new Map<number, Exercise>();
            workoutData.exercises.forEach((ex: Exercise) => exerciseLookup.set(ex.id, ex));
            savedTemps.forEach((ex: Exercise) => exerciseLookup.set(ex.id, ex));

            Object.entries(savedStates).forEach(([key, state]) => {
              const exerciseId = Number(key);
              const exerciseRef = exerciseLookup.get(exerciseId);
              const fallbackSets = Array.isArray((state as any)?.sets) ? (state as any).sets.length : undefined;
              normalizedStates[exerciseId] = normalizeExerciseState(state, exerciseRef?.base_sets ?? fallbackSets ?? null);
            });

            savedTemps.forEach((tempExercise: Exercise) => {
              if (!normalizedStates[tempExercise.id]) {
                normalizedStates[tempExercise.id] = buildInitialExerciseState(tempExercise.base_sets);
              }
            });

            workoutData.exercises.forEach((exercise: Exercise) => {
              if (!normalizedStates[exercise.id]) {
                normalizedStates[exercise.id] = buildInitialExerciseState(exercise.base_sets);
              }
            });

            initialStates = normalizedStates;
            initialTempExercises = savedTemps;
            setWorkoutActive(true);

            let restoredSessionGuid = savedSession.sessionGuid;
            if (!restoredSessionGuid) {
              restoredSessionGuid = generateWorkoutGUID();
              console.log('Generated new session GUID for restored workout:', restoredSessionGuid);
            } else {
              console.log('Restored workout session GUID:', restoredSessionGuid);
            }
            setWorkoutSessionId(restoredSessionGuid);
          } else {
            const freshStates: { [key: number]: { sets: SetData[]; notes: string; completed?: boolean; hidden?: boolean } } = {};
            workoutData.exercises.forEach((exercise: Exercise) => {
              freshStates[exercise.id] = buildInitialExerciseState(exercise.base_sets);
            });
            initialStates = freshStates;
            setWorkoutActive(false);
          }
        }

        setExerciseStates(initialStates);
        setTempExercises(initialTempExercises);
      } catch (error) {
        console.error('Error loading workout:', error);
      } finally {
        isRestoringSession.current = false;
        setLoading(false);
      }
    };

    if (id) {
      loadWorkout();
    }
  }, [id, currentUserId]);

  // Initialize exercise states if not exists
  const getExerciseState = (exerciseId: number, baseSets?: number) => {
    return normalizeExerciseState(exerciseStates[exerciseId], baseSets ?? null);
  };

  const handleExercisePress = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    let state = getExerciseState(exercise.id, exercise.base_sets);
    const existingState = exerciseStates[exercise.id];

    if (!existingState || !Array.isArray(existingState.sets) || existingState.sets.length !== state.sets.length) {
      const patchedStates = {
        ...exerciseStates,
        [exercise.id]: state
      };
      setExerciseStates(patchedStates);
      persistWorkoutSession(patchedStates, tempExercises);
    }

    // If this is a fresh exercise with default weights (not yet customized), prefill weights from last workout
    const hasDefaultWeights = state.sets.every(set => set.weight === 50);
    if (!state.completed && hasDefaultWeights && workout) {
      try {
        const lastWeights = await getLastWeightsForExercise(exercise.id, workout.id);
        const updatedSets = state.sets.map((set, index) => ({
          ...set,
          weight: lastWeights[index] || lastWeights[lastWeights.length - 1] || 50 // Use last available weight if fewer weights than sets
        }));

        const updatedState = { ...state, sets: updatedSets };
        const updatedStates = {
          ...exerciseStates,
          [exercise.id]: updatedState
        };
        setExerciseStates(updatedStates);
        persistWorkoutSession(updatedStates, tempExercises);
        state = updatedState;
      } catch (error) {
        console.error('Error prefilling weights:', error);
      }
    }

    setModalVisible(true);
  };

  const handleExerciseComplete = async (exerciseId: number) => {
    const exerciseRef = [...(workout?.exercises || []), ...tempExercises].find(ex => ex.id === exerciseId);
    if (!exerciseRef) {
      Toast.show({
        type: 'error',
        text1: 'Exercise Missing',
        text2: 'Unable to find this exercise in the workout.',
        visibilityTime: 1000,
      });
      return;
    }

    const previousStates = exerciseStates;
    const baseState = normalizeExerciseState(previousStates[exerciseId], exerciseRef.base_sets ?? null);
    const newCompleted = !baseState.completed;
    const updatedState = {
      ...baseState,
      completed: newCompleted
    };
    const updatedStates = {
      ...previousStates,
      [exerciseId]: updatedState
    };

    setExerciseStates(updatedStates);
    persistWorkoutSession(updatedStates, tempExercises);

    try {
      if (newCompleted) {
        const setsForSave = updatedState.sets.length > 0
          ? updatedState.sets
          : buildInitialExerciseState(exerciseRef.base_sets).sets;
        await recordExerciseCompletion(exerciseId, { ...updatedState, sets: setsForSave });
      } else {
        const result = await deleteExerciseCompletion(currentUserId, exerciseId);
        if (result.success) {
          Toast.show({
            type: 'info',
            text1: 'Exercise Unchecked',
            text2: `${exerciseRef.name} removed from completed exercises`,
            visibilityTime: 1000,
          });
        }
      }
    } catch (error) {
      console.error('Error updating exercise completion:', error);
      const revertedStates = {
        ...previousStates,
        [exerciseId]: baseState
      };
      setExerciseStates(revertedStates);
      persistWorkoutSession(revertedStates, tempExercises);

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update exercise completion',
        visibilityTime: 1000,
      });
    }
  };

  const recordExerciseCompletion = async (exerciseId: number, exerciseState: any) => {
    try {
      // Look for exercise in both workout exercises and temp exercises
      const exercise = [...(workout?.exercises || []), ...tempExercises].find(ex => ex.id === exerciseId);
      if (!exercise) return;

      console.log('Recording exercise completion:', {
        exerciseId,
        exerciseName: exercise.name,
        exerciseState
      });

      const activeSets = Array.isArray(exerciseState.sets) && exerciseState.sets.length > 0
        ? exerciseState.sets
        : buildInitialExerciseState(exercise.base_sets).sets;

      // Extract data from exercise state
      const setsCompleted = activeSets.length;
      const weightPerSet = activeSets.map((set: SetData) => set.weight);
      const difficultyPerSet = activeSets.map((set: SetData) => {
        // Store difficulty as direct numeric value (1-5)
        console.log('Saving difficulty for set:', set.difficulty);
        return set.difficulty || null;
      });
      const repsPerSet = activeSets.map(() => exercise.base_reps || 10); // Use base reps from exercise

      let sessionGuid = workoutSessionId;
      if (!sessionGuid) {
        sessionGuid = generateWorkoutGUID();
        setWorkoutSessionId(sessionGuid);
        console.log('Generated fallback session GUID for exercise completion:', sessionGuid);
      }

      const exerciseData = {
        setsCompleted,
        weightPerSet,
        difficultyPerSet,
        repsPerSet,
        comments: exerciseState.notes || '',
        workoutSessionId: sessionGuid
      };

      console.log('Exercise data to save:', exerciseData);
      console.log('Current workout session ID:', sessionGuid);

      const result = await recordCompletedExercise(currentUserId, exerciseId, exerciseData);

      console.log('Save result:', result);

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Exercise Completed! 💪',
          text2: `${exercise.name} recorded with ${setsCompleted} sets`,
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Recording Error',
          text2: 'Failed to save exercise completion',
          visibilityTime: 1000,
        });
      }
    } catch (error) {
      console.error('Error recording exercise completion:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to record exercise',
        visibilityTime: 1000,
      });
    }
  };

  const updateSetWeight = (setIndex: number, weight: number) => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    const newSets = [...state.sets];
    newSets[setIndex] = { ...newSets[setIndex], weight };
    const updatedState = { ...state, sets: newSets };
    const updatedStates = {
      ...exerciseStates,
      [selectedExercise.id]: updatedState
    };
    setExerciseStates(updatedStates);
    persistWorkoutSession(updatedStates, tempExercises);
  };

  const updateSetDifficulty = (setIndex: number, difficulty: 1 | 2 | 3 | 4 | 5) => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    const newSets = [...state.sets];
    newSets[setIndex] = { ...newSets[setIndex], difficulty };
    const updatedState = { ...state, sets: newSets };
    const updatedStates = {
      ...exerciseStates,
      [selectedExercise.id]: updatedState
    };
    setExerciseStates(updatedStates);
    persistWorkoutSession(updatedStates, tempExercises);
  };

  const addSet = () => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    const newSets = [...state.sets, createDefaultSet()];
    const updatedState = { ...state, sets: newSets };
    const updatedStates = {
      ...exerciseStates,
      [selectedExercise.id]: updatedState
    };
    setExerciseStates(updatedStates);
    persistWorkoutSession(updatedStates, tempExercises);
  };

  const removeSet = (setIndex: number) => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    if (state.sets.length <= 1) return; // Don't allow removing all sets

    Alert.alert(
      'Delete Set',
      `Are you sure you want to delete Set ${setIndex + 1}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newSets = state.sets.filter((_, index) => index !== setIndex);
            const updatedState = { ...state, sets: newSets };
            const updatedStates = {
              ...exerciseStates,
              [selectedExercise.id]: updatedState
            };
            setExerciseStates(updatedStates);
            persistWorkoutSession(updatedStates, tempExercises);
          },
        },
      ]
    );
  };

  // const saveNotes = () => {\n  //   if (!selectedExercise) return;\n  //   const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);\n  //   \n  //   const updatedState = { ...state, notes: tempNotes };\n  //   const updatedStates = {\n  //     ...exerciseStates,\n  //     [selectedExercise.id]: updatedState\n  //   };\n  //   setExerciseStates(updatedStates);\n  //   persistWorkoutSession(updatedStates, tempExercises);\n  // };

  const getDifficultyColor = (difficulty: number | string) => {
    switch (difficulty) {
      case 1: return '#4CAF50';  // Easy - Green
      case 2: return '#8BC34A';  // Light Green 
      case 3: return '#FF9800';  // Medium - Orange
      case 4: return '#FF5722';  // Hard - Red-Orange
      case 5: return '#F44336';  // Very Hard - Red
      // Legacy support
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#757575';
    }
  };

  const areAnyExercisesCompleted = () => {
    const allExercises = [...(workout?.exercises || []), ...tempExercises];
    return allExercises.some(exercise => {
      const state = exerciseStates[exercise.id];
      return state?.completed === true;
    });
  };

  const areAllExercisesCompleted = () => {
    const allExercises = [...(workout?.exercises || []), ...tempExercises];
    return allExercises.length > 0 && allExercises.every(exercise => {
      const state = exerciseStates[exercise.id];
      return state?.completed === true;
    });
  };

  const handleCompleteWorkout = () => {
    // Check if at least one exercise is completed
    if (!areAnyExercisesCompleted()) {
      Alert.alert(
        'No Exercises Completed',
        'You need to complete at least one exercise before finishing your workout.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setCompleteWorkoutModalVisible(true);
    setWorkoutDuration(''); // Reset duration
    setWorkoutComments(''); // Reset comments
  };

  const submitCompleteWorkout = async () => {
    if (!workout) return;

    if (!workoutDuration.trim()) {
      Alert.alert('Duration Required', 'Please enter the workout duration.');
      return;
    }

    try {
      setCompletingWorkout(true);

      console.log('Workout Detail: Completing workout for user:', currentUserId);

      let finalSessionGuid = workoutSessionId;
      if (!finalSessionGuid) {
        finalSessionGuid = generateWorkoutGUID();
        setWorkoutSessionId(finalSessionGuid);
        console.log('Generated fallback session GUID for workout completion:', finalSessionGuid);
      }

      // Record the completed workout with session GUID
      const result = await recordCompletedWorkout(
        currentUserId,
        workout.id,
        workout.name,
        parseInt(workoutDuration),
        workoutComments,
        null, // customDate
        finalSessionGuid // Pass session GUID
      );

      if (result.success) {
        // The workout session GUID is already unique - no need to update it
        // Exercises are already tagged with the unique GUID from the start
        console.log(`Workout completed with session GUID: ${finalSessionGuid}`);

        // Clear active workout from database
        try {
          await clearActiveWorkout(currentUserId);
          console.log(`Cleared active workout for user ${currentUserId} after completion`);
        } catch (error) {
          console.error('Error clearing active workout after completion:', error);
        }

        // Show success message
        Toast.show({
          type: 'success',
          text1: 'Workout Completed! 🎉',
          text2: `Great job completing ${workout.name}!`,
          visibilityTime: 3000,
        });

        // Reset workout state and navigate back
        resetWorkoutState();

        // Navigate to workout summary with the completion record ID
        setTimeout(() => {
          router.replace(`/workout-summary/${result.id}`);
        }, 100);

      } else {
        throw new Error('Failed to record workout completion');
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete workout. Please try again.',
        visibilityTime: 1000,
      });
    } finally {
      setCompletingWorkout(false);
    }
  };

  const cancelCompleteWorkout = () => {
    setCompleteWorkoutModalVisible(false);
    setWorkoutDuration('');
    setWorkoutComments('');
  };

  // Derived list including temp exercises, excluding hidden exercises
  const displayedExercises = [...(workout?.exercises || []).filter(ex => {
    const state = exerciseStates[ex.id];
    return !state?.hidden;
  }), ...tempExercises];

  const openAddTempExerciseModal = () => {
    setExerciseSearchQuery('');
    setExerciseSearchModalVisible(true);
  };

  const closeAddTempExerciseModal = () => {
    setExerciseSearchModalVisible(false);
  };

  const handleAddTempExercise = (exercise: Exercise) => {
    // Prevent duplicates (already in workout or temp list)
    const alreadyExists = (workout?.exercises || []).some(ex => ex.id === exercise.id) || tempExercises.some(ex => ex.id === exercise.id);
    if (alreadyExists) {
      Toast.show({
        type: 'info',
        text1: 'Already Added',
        text2: `${exercise.name} is already in this workout`,
        visibilityTime: 1500,
      });
      return;
    }

    const updatedTempExercises = [...tempExercises, exercise];
    setTempExercises(updatedTempExercises);

    const initialState = buildInitialExerciseState(exercise.base_sets);
    const updatedStates = {
      ...exerciseStates,
      [exercise.id]: initialState
    };
    setExerciseStates(updatedStates);
    persistWorkoutSession(updatedStates, updatedTempExercises);

    Toast.show({
      type: 'success',
      text1: 'Temp Exercise Added',
      text2: `${exercise.name} added to workout`,
      visibilityTime: 1000,
    });
  };

  const handleRemoveTempExercise = (exerciseId: number) => {
    const exerciseToRemove = tempExercises.find(ex => ex.id === exerciseId);
    if (!exerciseToRemove) return;

    // Remove from temp exercises
    const updatedTempExercises = tempExercises.filter(ex => ex.id !== exerciseId);
    setTempExercises(updatedTempExercises);

    // Remove from exercise states
    const updatedStates = { ...exerciseStates };
    delete updatedStates[exerciseId];
    setExerciseStates(updatedStates);

    // Update session
    persistWorkoutSession(updatedStates, updatedTempExercises);

    // Close modal
    setModalVisible(false);

    Toast.show({
      type: 'info',
      text1: 'Temp Exercise Removed',
      text2: `${exerciseToRemove.name} removed from workout`,
      visibilityTime: 1000,
    });
  };

  // Swap exercise with alternate
  const handleShowSwapOptions = (exercise: Exercise) => {
    if (exercise.alternates && exercise.alternates.length > 0) {
      setExerciseToSwap(exercise);
      setSwapModalVisible(true);
    }
  };

  const handleSwapExercise = (originalExercise: Exercise, alternateExercise: Exercise) => {
    if (!workout) return;

    // Store the original exercise for potential undo
    setOriginalExercises(prev => ({
      ...prev,
      [alternateExercise.id]: originalExercise
    }));

    // Check if this is a temp exercise
    const isTempExercise = tempExercises.some(ex => ex.id === originalExercise.id);

    // Create new alternates list: 
    // 1. Filter out the exercise we're swapping TO (to avoid self-reference)
    // 2. Add the original exercise only if it's not already in the list
    const existingAlternates = (originalExercise.alternates || []).filter(alt => alt.id !== alternateExercise.id);
    const originalAlreadyExists = existingAlternates.some(alt => alt.id === originalExercise.id);
    const newAlternates = originalAlreadyExists ? existingAlternates : [...existingAlternates, originalExercise];

    if (isTempExercise) {
      // Handle temp exercise swapping
      const updatedTempExercises = tempExercises.map(ex =>
        ex.id === originalExercise.id
          ? {
            ...alternateExercise,
            alternates: newAlternates
          }
          : ex
      );
      setTempExercises(updatedTempExercises);
    } else {
      // Handle regular workout exercise swapping
      const updatedExercises = workout.exercises.map(ex =>
        ex.id === originalExercise.id
          ? {
            ...alternateExercise,
            alternates: newAlternates
          }
          : ex
      );
      setWorkout({ ...workout, exercises: updatedExercises });
    }

    // Transfer exercise state from old to new exercise if it exists
    const oldState = exerciseStates[originalExercise.id];
    if (oldState) {
      const newStates = { ...exerciseStates };
      delete newStates[originalExercise.id];
      newStates[alternateExercise.id] = oldState;
      setExerciseStates(newStates);

      // Save updated session
      persistWorkoutSession(newStates, isTempExercise ?
        tempExercises.map(ex => ex.id === originalExercise.id
          ? {
            ...alternateExercise,
            alternates: newAlternates
          }
          : ex) : tempExercises);
    }

    setSwapModalVisible(false);
    setExerciseToSwap(null);

    Toast.show({
      type: 'success',
      text1: 'Exercise Swapped',
      text2: `${originalExercise.name} → ${alternateExercise.name} (Long press to undo)`,
      visibilityTime: 3500,
    });
  };

  const filteredExercises = allExercises.filter(ex => {
    // First check if it matches the search query
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
      ex.major_group.toLowerCase().includes(exerciseSearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Then check if it's not already in the workout
    const isInOriginalWorkout = (workout?.exercises || []).some(workoutEx => workoutEx.id === ex.id);
    const isInTempExercises = tempExercises.some(tempEx => tempEx.id === ex.id);

    return !isInOriginalWorkout && !isInTempExercises;
  }).slice(0, 50); // limit for performance

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <Text style={styles.errorText}>Workout not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {!workoutActive && (
            <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#155724" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{workout.name}</Text>
          {workoutActive ? (
            <TouchableOpacity style={styles.exitButton} onPress={exitWorkout}>
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={styles.exitButtonText}>Exit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          )}
        </View>

        {!workoutActive ? (
          <View style={styles.workoutPreview}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutDescription}>Tap &quot;Start&quot; to begin your workout</Text>
              <Text style={styles.workoutStats}>
                {workout.exercises.length} exercises • {workout.duration} min estimated
              </Text>
            </View>

            {/* Exercises Preview */}
            <View style={styles.exercisesPreviewSection}>
              <Text style={styles.previewSectionTitle}>Workout Exercises</Text>
              <ScrollView style={styles.exercisesPreviewList} showsVerticalScrollIndicator={false}>
                {workout.exercises.map((exercise, index) => (
                  <View key={exercise.id} style={styles.exercisePreviewCard}>
                    <View style={styles.exercisePreviewHeader}>
                      <Text style={styles.exercisePreviewNumber}>{index + 1}</Text>
                      <View style={styles.exercisePreviewInfo}>
                        <View style={styles.exerciseNameRow}>
                          <Text style={styles.exercisePreviewName}>{exercise.name}</Text>
                          {exercise.alternates && exercise.alternates.length > 0 && (
                            <View style={styles.alternatesBadge}>
                              <Ionicons name="swap-horizontal" size={10} color="#007AFF" />
                              <Text style={[styles.alternatesBadgeText, { fontSize: 8 }]}>{exercise.alternates.length}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.exercisePreviewDetails}>
                          {getExerciseState(exercise.id, exercise.base_sets).sets.length} sets × {exercise.base_reps || 10} {exercise.bodyweight ? 'seconds' : 'reps'}
                        </Text>
                        {exercise.major_group && (
                          <Text style={styles.exercisePreviewGroup}>{exercise.major_group}</Text>
                        )}
                      </View>
                      <View style={styles.exercisePreviewDuration}>
                        <Text style={styles.exercisePreviewDurationText}>
                          ~{exercise.estimated_duration || 10}min
                        </Text>
                      </View>
                    </View>
                    {exercise.description && (
                      <Text style={styles.exercisePreviewDescription} numberOfLines={2}>
                        {exercise.description}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          <>
            {/* Exercises List */}
            <ScrollView style={styles.exercisesList}>
              {displayedExercises.map((exercise) => {
                const isCompleted = exerciseStates[exercise.id]?.completed || false;
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseCard, isCompleted && styles.exerciseCardCompleted]}
                    onPress={() => handleExerciseComplete(exercise.id)}
                    onLongPress={() => handleShowSwapOptions(exercise)}
                    activeOpacity={0.7}
                  >
                    {/* Exercise Header */}
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseInfo}>
                        <View style={styles.exerciseNameRow}>
                          <Text style={[styles.exerciseName, isCompleted && styles.exerciseNameCompleted]}>{exercise.name}</Text>
                          {exercise.alternates && exercise.alternates.length > 0 && (
                            <View style={styles.alternatesBadge}>
                              <Ionicons name="swap-horizontal" size={12} color="#007AFF" />
                              <Text style={styles.alternatesBadgeText}>{exercise.alternates.length}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.exerciseDetails, isCompleted && styles.exerciseDetailsCompleted]}>
                          {getExerciseState(exercise.id, exercise.base_sets).sets.length} sets × {exercise.base_reps || 10} {exercise.bodyweight ? 'seconds' : 'reps'}
                        </Text>
                        {exercise.alternates && exercise.alternates.length > 0 && (
                          <Text style={styles.alternatesInfo}>
                            Alternates: {exercise.alternates.map(alt => alt.name).join(', ')}
                          </Text>
                        )}
                        {exercise.alternates && exercise.alternates.length > 0 && (
                          <Text style={styles.longPressHint}>
                            Hold to swap with alternate
                          </Text>
                        )}
                      </View>
                      <View style={styles.exerciseActions}>
                        {!isCompleted && (
                          <Text style={styles.tapToCompleteText}>Tap to complete</Text>
                        )}
                        {isCompleted && (
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text style={styles.completedBadgeText}>COMPLETED</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Tap to Edit - Only show if not completed */}
                    {!isCompleted && (
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleExercisePress(exercise);
                        }}
                      >
                        <Text style={styles.editButtonText}>
                          Tap to set weights & track sets
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#666" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Add Temp Exercise Button */}
              <TouchableOpacity style={styles.addTempButton} onPress={openAddTempExerciseModal}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addTempButtonText}>Add Temp Exercise</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Complete Workout Button */}
            {!modalVisible && (
              <View style={styles.completeWorkoutContainer}>
                <TouchableOpacity
                  style={[
                    styles.completeWorkoutButton,
                    areAnyExercisesCompleted() ? styles.completeWorkoutButtonActive : styles.completeWorkoutButtonInactive
                  ]}
                  onPress={handleCompleteWorkout}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={areAnyExercisesCompleted() ? "#fff" : "#999"}
                  />
                  <Text style={[
                    styles.completeWorkoutButtonText,
                    areAnyExercisesCompleted() ? styles.completeWorkoutButtonTextActive : styles.completeWorkoutButtonTextInactive
                  ]}>
                    {areAllExercisesCompleted()
                      ? 'Complete Workout'
                      : `Complete Workout (${Object.values(exerciseStates).filter(state => state?.completed).length} done)`
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Exercise Detail Modal */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => {
                setModalVisible(false);
              }}
            >
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => setModalVisible(false)}
                />
                <View style={styles.modalContent}>
                  <SafeAreaView style={{ flex: 1 }}>
                    {/* Header with close button */}
                    <View style={styles.modalHeaderContainer}>
                      <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
                      <View style={styles.modalHeaderButtons}>
                        {/* Remove button for temp exercises only */}
                        {selectedExercise && tempExercises.some(ex => ex.id === selectedExercise.id) && (
                          <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={() => handleRemoveTempExercise(selectedExercise.id)}
                          >
                            <Ionicons name="trash" size={18} color="#dc3545" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.closeButton}
                          onPress={() => setModalVisible(false)}
                        >
                          <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.modalSubtitle}>
                      {selectedExercise?.base_sets || 3} sets × {selectedExercise?.base_reps || 10} {selectedExercise?.bodyweight ? 'seconds' : 'reps'}
                    </Text>

                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                      showsVerticalScrollIndicator={true}
                      bounces={false}
                    >
                      {selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).sets.map((setData, index) => (
                        <View key={index} style={styles.setRow}>
                          <View style={styles.setRowHeader}>
                            <Text style={styles.setNumber}>Set {index + 1}</Text>
                            {getExerciseState(selectedExercise.id, selectedExercise.base_sets).sets.length > 1 && (
                              <TouchableOpacity
                                onPress={() => removeSet(index)}
                                style={styles.removeSetButton}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="close-circle" size={20} color="#dc3545" />
                              </TouchableOpacity>
                            )}
                          </View>

                          <View style={styles.setControls}>
                            {/* Weight Picker */}
                            <View style={styles.weightContainer}>
                              <Text style={styles.controlLabel}>{selectedExercise?.bodyweight ? 'Seconds' : 'Weight'}</Text>
                              <View style={styles.weightPicker}>
                                <TouchableOpacity
                                  onPress={() => updateSetWeight(index, Math.max(5, setData.weight - 5))}
                                  style={styles.weightButton}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="remove" size={16} color="#155724" />
                                </TouchableOpacity>
                                <Text style={styles.weightText}>{setData.weight} lbs</Text>
                                <TouchableOpacity
                                  onPress={() => updateSetWeight(index, setData.weight + 5)}
                                  style={styles.weightButton}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="add" size={16} color="#155724" />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Difficulty Buttons */}
                            <View style={styles.difficultyContainer}>
                              <Text style={styles.controlLabel}>Difficulty</Text>
                              <View style={styles.difficultyButtons}>
                                {([1, 2, 3, 4, 5] as const).map((diff) => (
                                  <TouchableOpacity
                                    key={diff}
                                    style={[
                                      styles.difficultyButton,
                                      {
                                        backgroundColor: setData.difficulty === diff ? getDifficultyColor(diff) : '#f0f0f0',
                                        borderColor: setData.difficulty === diff ? getDifficultyColor(diff) : '#ddd'
                                      }
                                    ]}
                                    onPress={() => updateSetDifficulty(index, diff)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={[
                                      styles.difficultyText,
                                      {
                                        color: setData.difficulty === diff ? '#fff' : '#666',
                                        fontWeight: setData.difficulty === diff ? 'bold' : '600'
                                      }
                                    ]}>
                                      {diff}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}

                      {/* Add Set Button */}
                      <TouchableOpacity
                        style={styles.addSetButton}
                        onPress={addSet}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={20} color="#155724" />
                        <Text style={styles.addSetText}>Add Set</Text>
                      </TouchableOpacity>

                      {/* Remove Exercise Button */}
                      <TouchableOpacity
                        style={styles.removeExerciseButton}
                        onPress={() => {
                          if (selectedExercise) {
                            if (tempExercises.some(ex => ex.id === selectedExercise.id)) {
                              // This is a temp exercise - remove it permanently
                              handleRemoveTempExercise(selectedExercise.id);
                            } else {
                              // This is a regular workout exercise - add it to a "hidden" list for this session
                              const exerciseToRemove = selectedExercise;

                              // Create a new temp list that excludes this exercise (acts as a hidden list)
                              // We'll track removed exercises by setting their state to "hidden"
                              const updatedStates = {
                                ...exerciseStates,
                                [exerciseToRemove.id]: {
                                  ...getExerciseState(exerciseToRemove.id, exerciseToRemove.base_sets),
                                  hidden: true
                                }
                              };

                              setExerciseStates(updatedStates);
                              persistWorkoutSession(updatedStates, tempExercises);

                              // Close modal
                              setModalVisible(false);

                              Toast.show({
                                type: 'info',
                                text1: 'Exercise Hidden',
                                text2: `${exerciseToRemove.name} hidden for this workout session`,
                                visibilityTime: 1000,
                              });
                            }
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove-circle" size={20} color="#dc3545" />
                        <Text style={styles.removeExerciseText}>Remove Exercise</Text>
                      </TouchableOpacity>

                      {/* Mark Complete Button */}
                      <TouchableOpacity
                        style={[
                          styles.markCompleteButton,
                          selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).completed && styles.markCompleteButtonCompleted
                        ]}
                        onPress={() => {
                          if (selectedExercise) {
                            handleExerciseComplete(selectedExercise.id);
                            setModalVisible(false);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).completed ? "checkmark-circle" : "checkmark-circle-outline"}
                          size={20}
                          color={selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).completed ? "#fff" : "#155724"}
                        />
                        <Text style={[
                          styles.markCompleteText,
                          selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).completed && styles.markCompleteTextCompleted
                        ]}>
                          {selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </SafeAreaView>
                </View>
              </View>
            </Modal>

            {/* Complete Workout Modal */}
            <Modal
              visible={completeWorkoutModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={cancelCompleteWorkout}
            >
              <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <View style={styles.completeWorkoutModal}>
                  <Text style={styles.completeWorkoutTitle}>Complete Workout</Text>
                  <Text style={styles.completeWorkoutSubtitle}>
                    Great job! How was your {workout?.name} workout?
                  </Text>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Duration (minutes) *</Text>
                    <TextInput
                      style={styles.durationInput}
                      value={workoutDuration}
                      onChangeText={setWorkoutDuration}
                      placeholder="e.g., 30"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Comments (optional)</Text>
                    <TextInput
                      style={styles.commentsInput}
                      value={workoutComments}
                      onChangeText={setWorkoutComments}
                      placeholder="How did you feel? Any notes about the workout..."
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={[styles.completeModalButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={cancelCompleteWorkout}
                      disabled={completingWorkout}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.finishButton, completingWorkout && styles.finishButtonDisabled]}
                      onPress={submitCompleteWorkout}
                      disabled={completingWorkout}
                    >
                      {completingWorkout ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.finishButtonText}>Finish Workout</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
            {/* Add Temp Exercise Modal */}
            <Modal
              visible={exerciseSearchModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={closeAddTempExerciseModal}
            >
              <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                <View style={styles.searchModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Temp Exercise</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={closeAddTempExerciseModal}>
                      <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises by name or group..."
                    value={exerciseSearchQuery}
                    onChangeText={setExerciseSearchQuery}
                  />
                  <ScrollView
                    style={styles.searchResults}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                  >
                    {filteredExercises.map(ex => (
                      <View key={ex.id} style={styles.searchResultRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{ex.name}</Text>
                          <Text style={styles.searchResultGroup}>{ex.major_group}</Text>
                        </View>
                        <TouchableOpacity style={styles.addButton} onPress={() => handleAddTempExercise(ex)}>
                          <Ionicons name="add" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {filteredExercises.length === 0 && (
                      <Text style={styles.emptySearchText}>No matches found</Text>
                    )}
                  </ScrollView>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeAddTempExerciseModal}>
                      <Text style={styles.cancelButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </>
        )}

        {/* Exit Workout Modal */}
        <Modal
          visible={exitWorkoutModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setExitWorkoutModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { justifyContent: 'center' }]}
            activeOpacity={1}
            onPress={() => setExitWorkoutModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.exitModalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.exitModalHeader}>
                <Text style={styles.exitModalTitle}>Exit Workout?</Text>
              </View>
              <Text style={styles.modalText}>
                Are you sure you want to exit this workout? All progress will be lost.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setExitWorkoutModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.exitButton]}
                  onPress={confirmExitWorkout}
                >
                  <Text style={styles.exitButtonText}>Exit Workout</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Active Workout Conflict Modal */}
        <Modal
          visible={activeWorkoutConflictModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={goBackFromConflict}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { justifyContent: 'center' }]}
            activeOpacity={1}
            onPress={goBackFromConflict}
          >
            <TouchableOpacity
              style={styles.exitModalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.exitModalHeader}>
                <Ionicons name="warning" size={24} color="#ff6b35" />
                <Text style={styles.exitModalTitle}>Active Workout Detected</Text>
              </View>
              <Text style={styles.modalText}>
                You already have an active workout &ldquo;{existingActiveWorkout?.name}&rdquo;.
                You can either continue with your existing workout or discard it to start this one.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={goBackFromConflict}
                >
                  <Text style={styles.cancelButtonText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.exitButton, discardingActiveWorkout && styles.finishButtonDisabled]}
                  onPress={discardActiveWorkoutAndStart}
                  disabled={discardingActiveWorkout}
                >
                  {discardingActiveWorkout ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.exitButtonText}>Discard & Start New</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Swap Exercise Modal */}
        <Modal
          visible={swapModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSwapModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}
            activeOpacity={1}
            onPress={() => setSwapModalVisible(false)}
          >
            <TouchableOpacity
              style={[styles.modalContent, { maxHeight: '50%' }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.modalHeaderContainer}>
                  <Text style={styles.modalTitle}>Swap Exercise</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSwapModalVisible(false)}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Swap &ldquo;{exerciseToSwap?.name}&rdquo; with an alternate
                </Text>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                >
                  {exerciseToSwap?.alternates?.map((alternate, index) => (
                    <TouchableOpacity
                      key={`${exerciseToSwap.id}-alternate-${alternate.id}-${index}`}
                      style={styles.swapOptionCard}
                      onPress={() => exerciseToSwap && handleSwapExercise(exerciseToSwap, alternate)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.swapOptionHeader}>
                        <Text style={styles.swapOptionName}>{alternate.name}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#007AFF" />
                      </View>

                      <Text style={styles.swapOptionDetails}>
                        {alternate.base_sets || 3} sets × {alternate.base_reps || 10} {alternate.bodyweight ? 'seconds' : 'reps'}
                      </Text>

                      {alternate.description && (
                        <Text style={styles.swapOptionDescription} numberOfLines={2}>
                          {alternate.description}
                        </Text>
                      )}

                      <View style={styles.swapOptionMuscles}>
                        <Text style={styles.swapOptionMuscleGroup}>
                          {alternate.major_group}
                          {alternate.minor_group && ` • ${alternate.minor_group}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {(!exerciseToSwap?.alternates || exerciseToSwap.alternates.length === 0) && (
                    <View style={[styles.container, styles.centerContainer]}>
                      <Ionicons name="fitness-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyText}>No alternates available</Text>
                      <Text style={styles.modalText}>
                        This exercise has no alternate options.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </SafeAreaView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingTop: 20
  },
  backArrow: {
    padding: 8,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
  },
  exercisesList: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#155724',
  },
  exerciseCardCompleted: {
    backgroundColor: '#155724',
    borderLeftColor: '#0d3f17',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseActions: {
    alignItems: 'flex-end',
  },
  tapToCompleteText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  exerciseNameCompleted: {
    color: '#fff',
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
  },
  exerciseDetailsCompleted: {
    color: '#d4edda',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editButtonText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '500',
  },
  editButtonTextCompleted: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    maxHeight: '90%',
  },
  modalSafeArea: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: '100%',
    minHeight: '75%',
    flex: 1,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exitModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  removeTempButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fee',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 4,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  setsContainer: {
    maxHeight: '100%',
  },
  setRow: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  setRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
  },
  removeSetButton: {
    padding: 4,
  },
  setControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightContainer: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weightPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 4,
  },
  weightButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  weightText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  difficultyContainer: {
    flex: 1,
    marginHorizontal: 35,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setCheckbox: {
    transform: [{ scale: 1.1 }],
  },
  notesSection: {
    marginTop: 16,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    minHeight: 60,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#155724',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  completeWorkoutContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completeWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completeWorkoutButtonActive: {
    backgroundColor: '#155724',
  },
  completeWorkoutButtonInactive: {
    backgroundColor: '#e0e0e0',
  },
  completeWorkoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completeWorkoutButtonTextActive: {
    color: '#fff',
  },
  completeWorkoutButtonTextInactive: {
    color: '#999',
  },
  addTempButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#155724',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
  },
  addTempButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#155724',
    borderStyle: 'dashed',
  },
  addSetText: {
    color: '#155724',
    fontWeight: '600',
    fontSize: 14,
  },
  removeExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe6e6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
    borderStyle: 'dashed',
  },
  removeExerciseText: {
    color: '#dc3545',
    fontWeight: '600',
    fontSize: 14,
  },
  markCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#155724',
    shadowColor: '#155724',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markCompleteButtonCompleted: {
    backgroundColor: '#155724',
    borderColor: '#0d3f17',
  },
  markCompleteText: {
    color: '#155724',
    fontWeight: '700',
    fontSize: 16,
  },
  markCompleteTextCompleted: {
    color: '#fff',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    padding: 8,
    backgroundColor: '#ffe6e6',
    borderRadius: 8,
  },
  exitModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  exitModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
  },
  completeWorkoutModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  completeWorkoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 8,
  },
  completeWorkoutSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
  },
  completeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  finishButton: {
    backgroundColor: '#155724',
    marginLeft: 8,
  },
  finishButtonDisabled: {
    opacity: 0.6,
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    height: '90%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  searchResults: {
    flex: 1,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
  },
  searchResultGroup: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#155724',
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  emptySearchText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#155724',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    fontWeight: '600',
  },
  // Workout state styles
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  workoutInfo: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  workoutDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  workoutStats: {
    fontSize: 14,
    color: '#155724',
    fontWeight: 'bold',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Workout Preview Styles
  workoutPreview: {
    flex: 1,
  },
  exercisesPreviewSection: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 12,
  },
  exercisesPreviewList: {
    flex: 1,
  },
  exercisePreviewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#155724',
  },
  exercisePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exercisePreviewNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#155724',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  exercisePreviewInfo: {
    flex: 1,
  },
  exercisePreviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  exercisePreviewDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  exercisePreviewGroup: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  exercisePreviewDuration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercisePreviewDurationText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exercisePreviewDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    paddingLeft: 36,
  },
  // Alternates visual indicators
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alternatesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  alternatesBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 2,
  },
  alternatesInfo: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  longPressHint: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Swap modal styles
  swapOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  swapOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  swapOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  swapOptionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  swapOptionDescription: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
    marginBottom: 8,
  },
  swapOptionMuscles: {
    marginTop: 4,
  },
  swapOptionMuscleGroup: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});