import { Ionicons } from '@expo/vector-icons';
import { default as Checkbox } from 'expo-checkbox';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../../components/CustomNavigation';
import { getWorkoutWithExercises, recordCompletedExercise } from '../../utils/database';


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
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
}

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseStates, setExerciseStates] = useState<{[key: number]: {sets: SetData[], notes: string, completed?: boolean}}>({});
  const [tempNotes, setTempNotes] = useState('');
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        setLoading(true);
        const workoutData = await getWorkoutWithExercises(parseInt(id as string));
        setWorkout(workoutData);
      } catch (error) {
        console.error('Error loading workout:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadWorkout();
    }
  }, [id]);

  // Initialize exercise states if not exists
  const getExerciseState = (exerciseId: number, baseSets?: number) => {
    if (!exerciseStates[exerciseId]) {
      // Use base_sets from database or default to 3
      const setsCount = baseSets || 3;
      const initialSets = Array(setsCount).fill(null).map(() => ({
        weight: 20,
        difficulty: 'medium' as const,
        completed: false
      }));
      const initialState = { sets: initialSets, notes: '', completed: false };
      setExerciseStates(prev => ({
        ...prev,
        [exerciseId]: initialState
      }));
      return initialState;
    }
    return exerciseStates[exerciseId];
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    const state = getExerciseState(exercise.id, exercise.base_sets);
    setTempNotes(state.notes);
    setModalVisible(true);
  };

  const handleExerciseComplete = async (exerciseId: number) => {
    // Toggle exercise completion in exerciseStates
    setExerciseStates(prev => {
      // If the exercise state doesn't exist, we need to get it properly initialized
      let currentState = prev[exerciseId];
      if (!currentState) {
        // Find the exercise to get the correct number of sets
        const exercise = workout?.exercises.find(ex => ex.id === exerciseId);
        if (exercise) {
          const initialSets = Array(exercise.base_sets || 3).fill(null).map(() => ({
            weight: 20,
            difficulty: 'medium' as const,
            completed: false
          }));
          currentState = { sets: initialSets, notes: '', completed: false };
        } else {
          currentState = { sets: [], notes: '', completed: false };
        }
      }
      
      const newCompleted = !currentState.completed;
      
      // If exercise is being marked as completed, record it in the database
      if (newCompleted && currentState.sets.length > 0) {
        recordExerciseCompletion(exerciseId, currentState);
      }
      
      return {
        ...prev,
        [exerciseId]: {
          ...currentState,
          completed: newCompleted
        }
      };
    });
  };

  const recordExerciseCompletion = async (exerciseId: number, exerciseState: any) => {
    try {
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      // Extract data from exercise state
      const setsCompleted = exerciseState.sets.length;
      const weightPerSet = exerciseState.sets.map((set: SetData) => set.weight);
      const difficultyPerSet = exerciseState.sets.map((set: SetData) => {
        // Convert difficulty to numeric scale (1-10)
        switch (set.difficulty) {
          case 'easy': return 3;
          case 'medium': return 6;
          case 'hard': return 9;
          default: return 6;
        }
      });
      const repsPerSet = exerciseState.sets.map(() => exercise.base_reps || 10); // Use base reps from exercise

      const exerciseData = {
        setsCompleted,
        weightPerSet,
        difficultyPerSet,
        repsPerSet,
        comments: exerciseState.notes || '',
        workoutSessionId: null // Could be enhanced to track workout sessions
      };

      const result = await recordCompletedExercise('default', exerciseId, exerciseData);
      
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
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('Error recording exercise completion:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to record exercise',
        visibilityTime: 2000,
      });
    }
  };

  const updateSetWeight = (setIndex: number, weight: number) => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    const newSets = [...state.sets];
    newSets[setIndex] = { ...newSets[setIndex], weight };
    
    setExerciseStates(prev => ({
      ...prev,
      [selectedExercise.id]: { ...state, sets: newSets }
    }));
  };

  const updateSetDifficulty = (setIndex: number, difficulty: 'easy' | 'medium' | 'hard') => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    const newSets = [...state.sets];
    newSets[setIndex] = { ...newSets[setIndex], difficulty };
    
    setExerciseStates(prev => ({
      ...prev,
      [selectedExercise.id]: { ...state, sets: newSets }
    }));
  };

  const saveNotes = () => {
    if (!selectedExercise) return;
    const state = getExerciseState(selectedExercise.id, selectedExercise.base_sets);
    
    setExerciseStates(prev => ({
      ...prev,
      [selectedExercise.id]: { ...state, notes: tempNotes }
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
        <CustomNavigation active="workout" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <Text style={styles.errorText}>Workout not found</Text>
        </View>
        <CustomNavigation active="workout" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{workout.name}</Text>
      </View>

      {/* Exercises List */}
      <ScrollView style={styles.exercisesList}>
        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            {/* Exercise Header */}
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDetails}>
                  {exercise.base_sets || 3} sets × {exercise.base_reps || 10} reps
                </Text>
              </View>
              <View style={styles.checkboxContainer}>
                {exerciseStates[exercise.id]?.completed && (
                  <Text style={styles.completedText}>Completed</Text>
                )}
                <Checkbox 
                  value={exerciseStates[exercise.id]?.completed || false}
                  onValueChange={() => handleExerciseComplete(exercise.id)}
                  style={styles.checkbox}
                  color={exerciseStates[exercise.id]?.completed ? '#155724' : undefined}
                />
              </View>
            </View>

            {/* Tap to Edit */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleExercisePress(exercise)}
            >
              <Text style={styles.editButtonText}>Tap to set weights & track sets</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header with close button */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedExercise?.base_sets || 3} sets × {selectedExercise?.base_reps || 10} reps
            </Text>

            <ScrollView style={styles.setsContainer}>
              {selectedExercise && getExerciseState(selectedExercise.id, selectedExercise.base_sets).sets.map((setData, index) => (
                <View key={index} style={styles.setRow}>
                  <Text style={styles.setNumber}>Set {index + 1}</Text>
                  
                  <View style={styles.setControls}>
                    {/* Weight Picker */}
                    <View style={styles.weightContainer}>
                      <Text style={styles.controlLabel}>Weight</Text>
                      <View style={styles.weightPicker}>
                        <TouchableOpacity 
                          onPress={() => updateSetWeight(index, Math.max(5, setData.weight - 5))}
                          style={styles.weightButton}
                        >
                          <Ionicons name="remove" size={16} color="#155724" />
                        </TouchableOpacity>
                        <Text style={styles.weightText}>{setData.weight} lbs</Text>
                        <TouchableOpacity 
                          onPress={() => updateSetWeight(index, setData.weight + 5)}
                          style={styles.weightButton}
                        >
                          <Ionicons name="add" size={16} color="#155724" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Difficulty Buttons */}
                    <View style={styles.difficultyContainer}>
                      <Text style={styles.controlLabel}>Difficulty</Text>
                      <View style={styles.difficultyButtons}>
                        {(['easy', 'medium', 'hard'] as const).map((diff) => (
                          <TouchableOpacity
                            key={diff}
                            style={[
                              styles.difficultyButton,
                              { backgroundColor: setData.difficulty === diff ? getDifficultyColor(diff) : '#f0f0f0' }
                            ]}
                            onPress={() => updateSetDifficulty(index, diff)}
                          >
                            <Ionicons 
                              name={
                                diff === 'easy' ? 'happy-outline' :
                                diff === 'medium' ? 'reorder-two-outline' :
                                'skull-outline'
                              }
                              size={16}
                              color={setData.difficulty === diff ? '#fff' : '#666'}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={tempNotes}
                onChangeText={setTempNotes}
                placeholder="Add notes about this exercise..."
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  saveNotes();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
      
      <CustomNavigation active="workout" />
    </View>
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
    paddingTop: 50
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
    marginRight: 8,
  },
  checkbox: {
    marginLeft: 8,
    transform: [{ scale: 1.5 }],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 4,
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
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
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
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
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
});