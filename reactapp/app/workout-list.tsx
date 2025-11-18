import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../components/CustomNavigation';
import {
  deleteWorkoutFromDB,
  getActiveWorkout,
  getCurrentUser,
  getWorkoutWithExercises,
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

export default function WorkoutList() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      // Initialize database first
      await initDatabase();
      
      // Load workouts from database
      const dbWorkouts = await getWorkoutsFromDB();
      setWorkouts(dbWorkouts);
      
      // Check for active workout
      await checkActiveWorkout();
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkActiveWorkout = async () => {
    try {
      // Get current user
      const user = await getCurrentUser();
      const userId = user?.username || user?.id || 'default';
      
      // Check for active workout
      const activeId = await getActiveWorkout(userId);
      setActiveWorkoutId(activeId);
      
      if (activeId) {
        // Load active workout details
        const workoutDetails = await getWorkoutWithExercises(activeId);
        setActiveWorkout(workoutDetails);
      } else {
        setActiveWorkout(null);
      }
    } catch (error) {
      console.error('Error checking active workout:', error);
    }
  };

  // Refresh workouts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const handleWorkoutPress = (workoutId: number) => {
    router.push(`/workout-detail/${workoutId}` as any);
  };

  const handleContinueWorkout = () => {
    if (activeWorkoutId) {
      router.push(`/workout-detail/${activeWorkoutId}` as any);
    }
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
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
        <CustomNavigation active="workout" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.title}>Select Workout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Active Workout Banner */}
        {activeWorkout && (
          <View style={styles.activeWorkoutBanner}>
            <View style={styles.activeWorkoutContent}>
              <View style={styles.activeWorkoutIcon}>
                <Ionicons name="play-circle" size={24} color="#ff6b35" />
              </View>
              <View style={styles.activeWorkoutText}>
                <Text style={styles.activeWorkoutTitle}>Active Workout</Text>
                <Text style={styles.activeWorkoutName}>{activeWorkout.name}</Text>
              </View>
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={handleContinueWorkout}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.workoutsContainer}>
          {workouts.map((workout, index) => {
            const isActiveWorkout = activeWorkout && activeWorkout.id === workout.id;
            return (
            <View key={`workout-${workout.id}-${index}`} style={[styles.workoutCard, isActiveWorkout && { backgroundColor: '#e8f5e8', borderColor: '#28a745', borderWidth: 2, shadowColor: '#28a745', shadowOpacity: 0.2 }]}>
              {isActiveWorkout && (
                <View style={{ position: 'absolute', top: -6, right: 12, backgroundColor: '#28a745', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, zIndex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 }}>ACTIVE</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.workoutContent}
                onPress={() => handleWorkoutPress(workout.id)}
              >
                <Text style={[styles.workoutName, isActiveWorkout && { color: '#155724', fontWeight: '700' }]}>{workout.name}</Text>
                <Text style={[styles.workoutDetails, isActiveWorkout && { color: '#155724' }]}>
                  {workout.num_exercises} exercises • {workout.duration} min
                </Text>
                <Text style={[styles.workoutGroup, isActiveWorkout && { color: '#155724', fontWeight: '500' }]}>{workout.major_group}</Text>
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
            );
          })}
        </View>
        
        {/* Create Workout Button - Centered Below Workouts */}
        <View style={styles.createWorkoutSection}>
          <TouchableOpacity
            style={styles.createWorkoutButton}
            onPress={() => router.push('/create-workout')}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.createWorkoutText}>Create New Workout</Text>
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
      
      <CustomNavigation active="workout" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f2f7f2', 
    padding: 16 
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 10,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#155724'
  },
  placeholder: {
    width: 24, // Same width as back button for centering
  },
  activeWorkoutBanner: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeWorkoutIcon: {
    marginRight: 12,
  },
  activeWorkoutText: {
    flex: 1,
  },
  activeWorkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  activeWorkoutName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  continueButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  workoutsContainer: {
    marginBottom: 40
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
  createWorkoutSection: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 100, // Space for navigation
  },
  createWorkoutButton: {
    backgroundColor: '#155724',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 12,
  },
  createWorkoutText: {
    fontSize: 16,
    color: '#155724',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40, // Extra padding for safe area
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
});