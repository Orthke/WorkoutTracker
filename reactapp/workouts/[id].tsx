import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity, Modal, TextInput } from 'react-native';

interface Exercise {
  id: number;
  name: string;
  description: string;
  major_group: string;
  minor_group?: string;
  base_sets?: number;
  base_reps?: number;
  estimated_duration?: number;
  press_pull?: string;
  category?: string;
  exercise_order?: number;
}

interface WorkoutWithExercises {
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
  weight: string;
  difficulty: 'easy' | 'medium' | 'hard' | '';
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<SetData[]>([]);

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        if (!id) {
          setError('Invalid workout ID');
          return;
        }
        
        // Sample workouts data matching our homepage
        const sampleWorkouts: WorkoutWithExercises[] = [
          {
            id: 1,
            name: "Upper Body Workout",
            num_exercises: 6,
            duration: 45,
            user: "beginner",
            order: 1,
            major_group: "Upper Body",
            exercises: [
              { id: 1, name: "Push-ups", description: "Classic push-up exercise", major_group: "Upper Body", base_sets: 3, base_reps: 12 },
              { id: 2, name: "Pull-ups", description: "Pull yourself up to the bar", major_group: "Upper Body", base_sets: 3, base_reps: 8 },
              { id: 3, name: "Bench Press", description: "Lie on bench and press weights up", major_group: "Upper Body", base_sets: 3, base_reps: 10 },
              { id: 4, name: "Shoulder Press", description: "Press weights overhead", major_group: "Upper Body", base_sets: 3, base_reps: 10 },
              { id: 5, name: "Bicep Curls", description: "Curl weights to work biceps", major_group: "Upper Body", base_sets: 3, base_reps: 12 },
              { id: 6, name: "Tricep Dips", description: "Dip down to work triceps", major_group: "Upper Body", base_sets: 3, base_reps: 10 }
            ]
          },
          {
            id: 2,
            name: "Lower Body Workout",
            num_exercises: 5,
            duration: 40,
            user: "beginner",
            order: 2,
            major_group: "Lower Body",
            exercises: [
              { id: 7, name: "Squats", description: "Basic squat movement", major_group: "Lower Body", base_sets: 3, base_reps: 15 },
              { id: 8, name: "Lunges", description: "Step forward and lunge down", major_group: "Lower Body", base_sets: 3, base_reps: 12 },
              { id: 9, name: "Deadlifts", description: "Lift weights from floor", major_group: "Lower Body", base_sets: 3, base_reps: 10 },
              { id: 10, name: "Calf Raises", description: "Rise up on toes", major_group: "Lower Body", base_sets: 3, base_reps: 20 },
              { id: 11, name: "Leg Press", description: "Press weights with legs", major_group: "Lower Body", base_sets: 3, base_reps: 12 }
            ]
          },
          {
            id: 3,
            name: "Full Body Workout",
            num_exercises: 8,
            duration: 60,
            user: "intermediate",
            order: 3,
            major_group: "Full Body",
            exercises: [
              { id: 12, name: "Burpees", description: "Full body explosive movement", major_group: "Full Body", base_sets: 3, base_reps: 10 },
              { id: 13, name: "Mountain Climbers", description: "Climb in plank position", major_group: "Full Body", base_sets: 3, base_reps: 20 },
              { id: 14, name: "Plank", description: "Hold plank position", major_group: "Core", base_sets: 3, base_reps: 1 },
              { id: 15, name: "Jumping Jacks", description: "Jump with arms and legs", major_group: "Full Body", base_sets: 3, base_reps: 30 },
              { id: 16, name: "Russian Twists", description: "Twist side to side", major_group: "Core", base_sets: 3, base_reps: 20 },
              { id: 17, name: "High Knees", description: "Run in place with high knees", major_group: "Cardio", base_sets: 3, base_reps: 30 },
              { id: 18, name: "Bear Crawl", description: "Crawl forward on hands and feet", major_group: "Full Body", base_sets: 3, base_reps: 10 },
              { id: 19, name: "Wall Sit", description: "Sit against wall", major_group: "Lower Body", base_sets: 3, base_reps: 1 }
            ]
          }
        ];
        
        const workoutData = sampleWorkouts.find(w => w.id === Number(id));
        if (!workoutData) {
          setError('Workout not found');
          return;
        }
        
        setWorkout(workoutData);
      } catch (err) {
        console.error('Error loading workout:', err);
        setError('Failed to load workout');
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [id]);

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    // Initialize sets based on the exercise's base_sets
    const numSets = exercise.base_sets || 3;
    const initialSets: SetData[] = Array(numSets).fill(null).map(() => ({
      weight: '',
      difficulty: ''
    }));
    setSets(initialSets);
    setModalVisible(true);
  };

  const updateSetWeight = (setIndex: number, weight: string) => {
    const newSets = [...sets];
    newSets[setIndex].weight = weight;
    setSets(newSets);
  };

  const updateSetDifficulty = (setIndex: number, difficulty: 'easy' | 'medium' | 'hard') => {
    const newSets = [...sets];
    newSets[setIndex].difficulty = difficulty;
    setSets(newSets);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedExercise(null);
    setSets([]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#155724" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Workout not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.workoutTitle}>{workout.name}</Text>
        <Text style={styles.workoutSubtitle}>
          {workout.num_exercises} exercises • {workout.duration} minutes
        </Text>
        <Text style={styles.workoutGroup}>{workout.major_group}</Text>
      </View>

      <View style={styles.exercisesSection}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        {workout.exercises.map((exercise, index) => (
          <TouchableOpacity 
            key={exercise.id} 
            style={styles.exerciseCard}
            onPress={() => handleExercisePress(exercise)}
            activeOpacity={0.7}
          >
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseNumber}>{index + 1}</Text>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
            </View>
            
            <Text style={styles.exerciseDescription}>{exercise.description}</Text>
            
            <View style={styles.exerciseDetails}>
              {exercise.base_sets && exercise.base_reps && (
                <Text style={styles.setsReps}>
                  {exercise.base_sets} sets × {exercise.base_reps} reps
                </Text>
              )}
              {exercise.minor_group && (
                <Text style={styles.muscleGroup}>Target: {exercise.minor_group}</Text>
              )}
              {exercise.estimated_duration && (
                <Text style={styles.duration}>~{exercise.estimated_duration} min</Text>
              )}
            </View>
            <Text style={styles.tapToEdit}>Tap to log sets</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Exercise Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedExercise && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.modalExerciseDescription}>{selectedExercise.description}</Text>
                <Text style={styles.modalSetsReps}>
                  {selectedExercise.base_sets} sets × {selectedExercise.base_reps} reps
                </Text>
              </View>
              
              <View style={styles.setsSection}>
                <Text style={styles.setsSectionTitle}>Log Your Sets</Text>
                {sets.map((set, index) => (
                  <View key={index} style={styles.setRow}>
                    <Text style={styles.setNumber}>Set {index + 1}</Text>
                    
                    <View style={styles.weightSection}>
                      <Text style={styles.weightLabel}>Weight:</Text>
                      <TextInput
                        style={styles.weightInput}
                        value={set.weight}
                        onChangeText={(text) => updateSetWeight(index, text)}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                      <Text style={styles.weightUnit}>lbs</Text>
                    </View>
                    
                    <View style={styles.difficultySection}>
                      <Text style={styles.difficultyLabel}>Difficulty:</Text>
                      <View style={styles.difficultyButtons}>
                        {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                          <TouchableOpacity
                            key={difficulty}
                            style={[
                              styles.difficultyButton,
                              set.difficulty === difficulty && styles.difficultyButtonActive,
                              difficulty === 'easy' && styles.easyButton,
                              difficulty === 'medium' && styles.mediumButton,
                              difficulty === 'hard' && styles.hardButton,
                            ]}
                            onPress={() => updateSetDifficulty(index, difficulty)}
                          >
                            <Text style={[
                              styles.difficultyButtonText,
                              set.difficulty === difficulty && styles.difficultyButtonTextActive
                            ]}>
                              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity style={styles.saveButton} onPress={closeModal}>
                <Text style={styles.saveButtonText}>Save Sets</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f7f2',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  workoutSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  workoutGroup: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  exercisesSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#155724',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  exerciseDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  setsReps: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  muscleGroup: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#888',
  },
  tapToEdit: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  exerciseInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalExerciseDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  modalSetsReps: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
  },
  setsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  setsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 16,
  },
  setRow: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  setNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 12,
  },
  weightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 12,
    width: 60,
  },
  weightInput: {
    borderWidth: 2,
    borderColor: '#155724',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  weightUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  difficultySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 12,
    width: 60,
  },
  difficultyButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  difficultyButton: {
    flex: 1,
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  difficultyButtonActive: {
    backgroundColor: '#fff',
  },
  easyButton: {
    borderColor: '#4caf50',
  },
  mediumButton: {
    borderColor: '#ff9800',
  },
  hardButton: {
    borderColor: '#f44336',
  },
  difficultyButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  difficultyButtonTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#155724',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});