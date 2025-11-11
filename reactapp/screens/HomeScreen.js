
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen({ navigation }) {
  const [dbWorkouts, setDbWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        // Load simple sample data for now
        const sampleWorkouts = [
          {
            id: 1,
            name: "Upper Body Workout",
            num_exercises: 6,
            duration: 45,
            user: "beginner",
            order: 1,
            major_group: "Upper Body"
          },
          {
            id: 2,
            name: "Lower Body Workout",
            num_exercises: 5,
            duration: 40,
            user: "beginner",
            order: 2,
            major_group: "Lower Body"
          },
          {
            id: 3,
            name: "Full Body Workout",
            num_exercises: 8,
            duration: 60,
            user: "intermediate",
            order: 3,
            major_group: "Full Body"
          }
        ];
        setDbWorkouts(sampleWorkouts);
      } catch (error) {
        console.error('Failed to load workouts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkouts();
  }, []);

  const handleWorkoutPress = (workoutId) => {
    navigation.navigate('WorkoutScreen', { workoutId });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Workout Tracker</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      ) : (
        <View style={styles.workoutsContainer}>
          <Text style={styles.sectionTitle}>Available Workouts</Text>
          {dbWorkouts.map((workout) => (
            <TouchableOpacity 
              key={workout.id} 
              style={styles.workoutCard}
              onPress={() => handleWorkoutPress(workout.id)}
            >
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutDetails}>
                {workout.num_exercises} exercises • {workout.duration} min
              </Text>
              <Text style={styles.workoutGroup}>{workout.major_group}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f2f7f2', 
    padding: 16 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#000', 
    textAlign: 'center', 
    marginVertical: 16 
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666'
  },
  workoutsContainer: {
    paddingBottom: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 16
  },
  workoutCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  workoutGroup: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic'
  }
});
