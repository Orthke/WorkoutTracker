import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function WorkoutScreen({ route }) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // TODO: Add modal functionality similar to expo-router version

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        if (!workoutId) {
          setError('Invalid workout ID');
          return;
        }
        
        // Sample workouts data matching our homepage
        const sampleWorkouts = [
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
        
        const workoutData = sampleWorkouts.find(w => w.id === Number(workoutId));
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
  }, [workoutId]);

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
          <View key={exercise.id} style={styles.exerciseCard}>
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
          </View>
        ))}
      </View>
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
});