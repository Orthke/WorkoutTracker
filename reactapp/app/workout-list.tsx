import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../components/CustomNavigation';
import {
  archiveWorkout,
  deleteWorkoutFromDB,
  getActiveWorkout,
  getArchivedWorkoutsFromDB,
  getCurrentUser,
  getUserWorkoutHistory,
  getWorkoutWithExercises,
  getWorkoutsFromDB,
  initDatabase,
  restoreWorkout,
  updateWorkoutOrder
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
  const [archivedWorkouts, setArchivedWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [archiveDeleteModalVisible, setArchiveDeleteModalVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [showArchivedWorkouts, setShowArchivedWorkouts] = useState(false);
  const [lastCompletedWorkout, setLastCompletedWorkout] = useState<{workout_id: number, workout_name: string, completed_at: string} | null>(null);

  const loadLastCompletedWorkout = useCallback(async () => {
    try {
      // Get current user
      const user = await getCurrentUser();
      const userId = user?.username || user?.id || 'default';
      
      // Get the most recent workout completion
      const workoutHistory = await getUserWorkoutHistory(userId, 1);
      if (workoutHistory && workoutHistory.length > 0) {
        const lastWorkout = workoutHistory[0];
        setLastCompletedWorkout({
          workout_id: lastWorkout.workout_id,
          workout_name: lastWorkout.workout_name,
          completed_at: lastWorkout.completed_at
        });
      } else {
        setLastCompletedWorkout(null);
      }
    } catch (error) {
      console.error('Error loading last completed workout:', error);
      setLastCompletedWorkout(null);
    }
  }, []);

  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      // Initialize database first
      await initDatabase();
      
      // Load workouts from database
      const dbWorkouts = await getWorkoutsFromDB();
      setWorkouts(dbWorkouts);
      
      // Load archived workouts
      const archivedDbWorkouts = await getArchivedWorkoutsFromDB();
      setArchivedWorkouts(archivedDbWorkouts);
      
      // Check for active workout
      await checkActiveWorkout();
      
      // Load last completed workout
      await loadLastCompletedWorkout();
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [loadLastCompletedWorkout]);

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
    setArchiveDeleteModalVisible(true);
  };

  const handleReorderWorkouts = async (data: Workout[]) => {
    try {
      // Update local state immediately
      setWorkouts(data);
      
      // Update order in database
      for (let i = 0; i < data.length; i++) {
        await updateWorkoutOrder(data[i].id, i + 1);
      }
    } catch (error) {
      console.error('Error reordering workouts:', error);
      // Reload workouts to revert changes
      loadWorkouts();
    }
  };

  const handleArchiveWorkout = async () => {
    if (!workoutToDelete) return;
    
    try {
      setDeleting(true);
      await archiveWorkout(workoutToDelete.id);
      
      // Refresh workout lists
      await loadWorkouts();
      
      Toast.show({
        type: 'success',
        text1: 'Workout Archived',
        text2: `${workoutToDelete.name} was archived successfully`,
        visibilityTime: 3000,
      });
      
    } catch (error) {
      console.error('Error archiving workout:', error);
      Toast.show({
        type: 'error',
        text1: 'Archive Failed',
        text2: 'Failed to archive workout. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setDeleting(false);
      setArchiveDeleteModalVisible(false);
      setWorkoutToDelete(null);
    }
  };

  const handleRestoreWorkout = async (workout: Workout) => {
    try {
      await restoreWorkout(workout.id);
      
      // Refresh workout lists
      await loadWorkouts();
      
      Toast.show({
        type: 'success',
        text1: 'Workout Restored',
        text2: `${workout.name} was restored successfully`,
        visibilityTime: 3000,
      });
      
    } catch (error) {
      console.error('Error restoring workout:', error);
      Toast.show({
        type: 'error',
        text1: 'Restore Failed',
        text2: 'Failed to restore workout. Please try again.',
        visibilityTime: 3000,
      });
    }
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
      setArchiveDeleteModalVisible(false);
      setWorkoutToDelete(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
        <CustomNavigation active="workout" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.title}>Select Workout</Text>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => setIsEditMode(!isEditMode)}
          >
            <Ionicons 
              name={isEditMode ? "checkmark" : "create-outline"} 
              size={24} 
              color={isEditMode ? "#28a745" : "#155724"} 
            />
          </TouchableOpacity>
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

        {isEditMode ? (
          <DraggableFlatList
            data={workouts}
            onDragEnd={({ data }) => handleReorderWorkouts(data)}
            keyExtractor={(item, index) => `workout-${item.id}-${index}`}
            renderItem={({ item: workout, drag, isActive }: RenderItemParams<Workout>) => {
              const isActiveWorkout = activeWorkout && activeWorkout.id === workout.id;
              return (
                <View style={[styles.workoutCard, isActiveWorkout && styles.activeWorkoutCard, isActive && styles.draggingCard]}>
                  {isActiveWorkout && (
                    <View style={styles.activeWorkoutBadge}>
                      <Text style={styles.activeWorkoutBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.workoutContent}
                    onPress={() => handleWorkoutPress(workout.id)}
                  >
                    <Text style={[styles.workoutName, isActiveWorkout && styles.activeWorkoutTextStyle]}>{workout.name}</Text>
                    <Text style={[styles.workoutDetails, isActiveWorkout && styles.activeWorkoutTextStyle]}>
                      {workout.num_exercises} exercises • {workout.duration} min
                    </Text>
                    <Text style={[styles.workoutGroup, isActiveWorkout && styles.activeWorkoutTextStyle]}>{workout.major_group}</Text>
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
                    <TouchableOpacity
                      style={[styles.actionButton, styles.dragHandle]}
                      onPressIn={drag}
                    >
                      <Ionicons name="reorder-three-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.workoutsContainer}
            ListFooterComponent={() => (
              <>
                {/* Archived Workouts Section */}
                {archivedWorkouts.length > 0 && (
                  <View style={styles.archivedSection}>
                    <TouchableOpacity 
                      style={styles.archivedHeader}
                      onPress={() => setShowArchivedWorkouts(!showArchivedWorkouts)}
                    >
                      <Text style={styles.archivedTitle}>Archived Workouts ({archivedWorkouts.length})</Text>
                      <Ionicons 
                        name={showArchivedWorkouts ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    
                    {showArchivedWorkouts && (
                      <View style={styles.archivedList}>
                        {archivedWorkouts.map((workout, index) => (
                          <View key={`archived-${workout.id}-${index}`} style={styles.archivedWorkoutCard}>
                            <View style={styles.workoutContent}>
                              <Text style={styles.archivedWorkoutName}>{workout.name}</Text>
                              <Text style={styles.archivedWorkoutDetails}>
                                {workout.num_exercises} exercises • {workout.duration} min
                              </Text>
                              <Text style={styles.archivedWorkoutGroup}>{workout.major_group}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.restoreButton}
                              onPress={() => handleRestoreWorkout(workout)}
                            >
                              <Ionicons name="refresh-outline" size={20} color="#28a745" />
                              <Text style={styles.restoreButtonText}>Restore</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                
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
              </>
            )}
          />
        ) : (
          <FlatList
            data={workouts}
            keyExtractor={(item, index) => `workout-${item.id}-${index}`}
            renderItem={({ item: workout, index }) => {
              const isActiveWorkout = activeWorkout && activeWorkout.id === workout.id;
              const isLastCompleted = lastCompletedWorkout?.workout_id === workout.id;
              
              const formatLastCompletedDate = (dateString: string) => {
                try {
                  const date = new Date(dateString);
                  const now = new Date();
                  const diffTime = now.getTime() - date.getTime();
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays === 0) {
                    return 'Today';
                  } else if (diffDays === 1) {
                    return 'Yesterday';
                  } else if (diffDays < 7) {
                    return `${diffDays} days ago`;
                  } else {
                    return date.toLocaleDateString();
                  }
                } catch {
                  return 'Unknown';
                }
              };
              
              return (
                <View style={[
                  styles.workoutCard, 
                  isActiveWorkout && styles.activeWorkoutCard,
                  isLastCompleted && styles.lastCompletedWorkoutCard
                ]}>
                  {isActiveWorkout && (
                    <View style={styles.activeWorkoutBadge}>
                      <Text style={styles.activeWorkoutBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.workoutContent}
                    onPress={() => handleWorkoutPress(workout.id)}
                  >
                    <Text style={[styles.workoutName, isActiveWorkout && styles.activeWorkoutTextStyle]}>{workout.name}</Text>
                    <Text style={[styles.workoutDetails, isActiveWorkout && styles.activeWorkoutTextStyle]}>
                      {workout.num_exercises} exercises • {workout.duration} min
                    </Text>
                    <Text style={[styles.workoutGroup, isActiveWorkout && styles.activeWorkoutTextStyle]}>{workout.major_group}</Text>
                    {isLastCompleted && (
                      <View style={styles.lastCompletedIndicator}>
                        <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                        <Text style={styles.lastCompletedText}>
                          Last completed: {formatLastCompletedDate(lastCompletedWorkout!.completed_at)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
            contentContainerStyle={styles.workoutsContainer}
            ListFooterComponent={() => (
              <>
                {/* Archived Workouts Section */}
                {archivedWorkouts.length > 0 && (
                  <View style={styles.archivedSection}>
                    <TouchableOpacity 
                      style={styles.archivedHeader}
                      onPress={() => setShowArchivedWorkouts(!showArchivedWorkouts)}
                    >
                      <Text style={styles.archivedTitle}>Archived Workouts ({archivedWorkouts.length})</Text>
                      <Ionicons 
                        name={showArchivedWorkouts ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    
                    {showArchivedWorkouts && (
                      <View style={styles.archivedList}>
                        {archivedWorkouts.map((workout, index) => (
                          <View key={`archived-${workout.id}-${index}`} style={styles.archivedWorkoutCard}>
                            <View style={styles.workoutContent}>
                              <Text style={styles.archivedWorkoutName}>{workout.name}</Text>
                              <Text style={styles.archivedWorkoutDetails}>
                                {workout.num_exercises} exercises • {workout.duration} min
                              </Text>
                              <Text style={styles.archivedWorkoutGroup}>{workout.major_group}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.restoreButton}
                              onPress={() => handleRestoreWorkout(workout)}
                            >
                              <Ionicons name="refresh-outline" size={20} color="#28a745" />
                              <Text style={styles.restoreButtonText}>Restore</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                
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
              </>
            )}
          />
        )}
        
        {/* Archive/Delete Choice Modal */}
        <Modal
          visible={archiveDeleteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setArchiveDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModal}>
              <View style={styles.deleteModalHeader}>
                <Ionicons name="help-circle" size={24} color="#ff6b35" />
                <Text style={styles.deleteModalTitle}>What would you like to do?</Text>
              </View>
              <Text style={styles.deleteModalMessage}>
                Archive &ldquo;{workoutToDelete?.name}&rdquo; to keep your data but hide it from the list, or permanently delete it.
              </Text>
              <View style={styles.deleteModalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setArchiveDeleteModalVisible(false)}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.archiveButton, deleting && styles.deleteConfirmButtonDisabled]}
                  onPress={handleArchiveWorkout}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.archiveButtonText}>Archive</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deleteConfirmButton, deleting && styles.deleteConfirmButtonDisabled]}
                  onPress={confirmDelete}
                  disabled={deleting}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete Forever</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
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
  // Active workout styles
  activeWorkoutCard: {
    backgroundColor: '#e8f5e8',
    borderColor: '#28a745',
    borderWidth: 2,
    shadowColor: '#28a745',
    shadowOpacity: 0.2,
  },
  lastCompletedWorkoutCard: {
    borderColor: '#28a745',
    borderWidth: 1,
    backgroundColor: '#f8fff8',
  },
  activeWorkoutBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  activeWorkoutBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeWorkoutTextStyle: {
    color: '#155724',
    fontWeight: '700',
  },
  // Drag and drop styles
  draggingCard: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    backgroundColor: '#f8f8f8',
  },
  // Archived workouts styles
  archivedSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  archivedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  archivedList: {
    marginTop: 8,
  },
  archivedWorkoutCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  archivedWorkoutName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  archivedWorkoutDetails: {
    fontSize: 14,
    color: '#adb5bd',
    marginBottom: 4,
  },
  archivedWorkoutGroup: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  restoreButtonText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  lastCompletedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lastCompletedText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },

  // Archive modal styles
  archiveButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    marginRight: 8,
  },
  archiveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});