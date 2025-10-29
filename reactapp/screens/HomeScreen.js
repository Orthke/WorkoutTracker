import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getWorkouts } from '../utils/storage';

export default function HomeScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    // Load workouts from storage when screen is focused
    const loadWorkouts = async () => {
      const data = await getWorkouts();
      setWorkouts(data);
    };
    loadWorkouts();
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Workout Tracker</Text>
      <Button title="Add New Workout" onPress={() => navigation.navigate('AddWorkout')} />
      <Text style={styles.listTitle}>Tracked Workouts:</Text>
      <FlatList
        data={workouts}
        keyExtractor={(item, idx) => idx.toString()}
        ListEmptyComponent={<Text style={styles.empty}>No workouts yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.workoutItem}>
            <Text style={styles.workoutName}>{item.name}</Text>
            <Text style={styles.workoutDate}>{item.date}</Text>
            <Text style={styles.workoutNotes}>{item.notes}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  listTitle: { fontSize: 18, marginTop: 30, marginBottom: 10 },
  empty: { color: '#888', fontStyle: 'italic', marginTop: 10 },
  workoutItem: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  workoutName: { fontWeight: 'bold', fontSize: 16 },
  workoutDate: { color: '#666', fontSize: 14 },
  workoutNotes: { color: '#333', fontSize: 14 },
});
