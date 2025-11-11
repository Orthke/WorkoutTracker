import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../components/CustomNavigation';
import {
  deleteWorkoutFromDB,
  getWorkoutsFromDB,
  initDatabase
} from '../utils/database';

interface Workout {
  id: number;
  name: string;
  num_exercises: number;
  duration: number;
  major_group: string;
}

export default function Index() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      // Initialize database first
      await initDatabase();
      
      // Load workouts from database
      const dbWorkouts = await getWorkoutsFromDB();
      setWorkouts(dbWorkouts);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  // Refresh workouts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const handleWorkoutPress = (workoutId: number) => {
    router.push(`/workout-detail/${workoutId}` as any);
  };

  const handleEditWorkout = (workoutId: number) => {
    router.push(`/edit-workout/${workoutId}` as any);
  };

  const handleDeleteWorkout = (workout: Workout) => {
    setWorkoutToDelete(workout);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!workoutToDelete) return;
    
    try {
      setDeleting(true);
      await deleteWorkoutFromDB(workoutToDelete.id);
      
      // Refresh workout list
      await loadWorkouts();
      
      Toast.show({
        type: 'success',
        text1: 'Workout Deleted',
        text2: `${workoutToDelete.name} was deleted successfully`,
        visibilityTime: 3000,
      });
      
    } catch (error) {
      console.error('Error deleting workout:', error);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Failed to delete workout. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setWorkoutToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setWorkoutToDelete(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
        <CustomNavigation active="home" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Workout Tracker</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/create-workout')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.workoutsContainer}>
          <Text style={styles.sectionTitle}>Available Workouts</Text>
          {workouts.map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <TouchableOpacity 
                style={styles.workoutContent}
                onPress={() => handleWorkoutPress(workout.id)}
              >
                <Text style={styles.workoutName}>{workout.name}</Text>
                <Text style={styles.workoutDetails}>
                  {workout.num_exercises} exercises • {workout.duration} min
                </Text>
                <Text style={styles.workoutGroup}>{workout.major_group}</Text>
              </TouchableOpacity>
              <View style={styles.workoutActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditWorkout(workout.id)}
                >
                  <Ionicons name="create-outline" size={20} color="#155724" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteWorkout(workout)}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        
        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelDelete}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModal}>
              <View style={styles.deleteModalHeader}>
                <Ionicons name="warning" size={24} color="#e74c3c" />
                <Text style={styles.deleteModalTitle}>Delete Workout</Text>
              </View>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete &ldquo;{workoutToDelete?.name}&rdquo;? This action cannot be undone.
              </Text>
              <View style={styles.deleteModalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={cancelDelete}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deleteConfirmButton, deleting && styles.deleteConfirmButtonDisabled]}
                  onPress={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
      
      <CustomNavigation active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f2f7f2', 
    padding: 16 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingTop: 50
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#000'
  },
  createButton: {
    backgroundColor: '#155724',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  workoutsContainer: {
    marginBottom: 100
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '600', 
    color: '#155724', 
    marginBottom: 16 
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutContent: {
    flex: 1,
    padding: 16,
  },
  workoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#ffe6e6',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  workoutGroup: { 
    fontSize: 12, 
    color: '#888', 
    fontStyle: 'italic' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  deleteConfirmButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.6,
  },
  deleteConfirmButtonText: {
    fontSize: 16,
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
});
