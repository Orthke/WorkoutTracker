import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import CustomNavigation from '../../components/CustomNavigation';
import { getWorkoutsFromDB, initDatabase } from '../../utils/database';

export default function WorkoutIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectToFirstWorkout = async () => {
      try {
        await initDatabase();
        const workouts = await getWorkoutsFromDB();
        
        if (workouts && workouts.length > 0) {
          // Navigate to the first workout
          router.replace(`/workout-detail/${workouts[0].id}`);
        } else {
          // No workouts available, go to home
          router.replace('/');
        }
      } catch (error) {
        console.error('Error loading workouts:', error);
        router.replace('/');
      }
    };

    redirectToFirstWorkout();
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#155724" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
      
      <CustomNavigation active="workout" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});