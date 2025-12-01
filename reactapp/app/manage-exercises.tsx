import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { deleteCustomExercise, getCurrentUser, getUserCustomExercises } from '../utils/database';

interface Exercise {
  id: number;
  name: string;
  description: string;
  major_group: string;
  minor_group: string;
  base_sets: number;
  base_reps: number;
  estimated_duration: number;
  press_pull: string;
  category: string;
  bodyweight: boolean;
  user_id: string;
  is_custom: boolean;
  created_at: string;
}

export default function ManageExercisesScreen() {
  const router = useRouter();
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('default');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUserExercises = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const user = await getCurrentUser();
      const userId = user?.username || 'default';
      setCurrentUserId(userId);
      
      // Load custom exercises
      const exercises = await getUserCustomExercises(userId);
      console.log('Manage Exercises: Loaded exercises:', exercises);
      setCustomExercises(exercises);
    } catch (error) {
      console.error('Error loading user exercises:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load custom exercises',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserExercises();
    }, [loadUserExercises])
  );

  const handleDeleteExercise = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
    setDeleteModalVisible(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;

    try {
      setDeleting(true);
      await deleteCustomExercise(exerciseToDelete.id, currentUserId);
      
      setCustomExercises(prev => prev.filter(ex => ex.id !== exerciseToDelete.id));
      
      Toast.show({
        type: 'success',
        text1: 'Exercise Deleted',
        text2: `${exerciseToDelete.name} has been deleted`,
        visibilityTime: 3000,
      });
      
      setDeleteModalVisible(false);
      setExerciseToDelete(null);
    } catch (error) {
      console.error('Error deleting exercise:', error);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Unable to delete exercise. It may be used in workouts.',
        visibilityTime: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteExercise = () => {
    setDeleteModalVisible(false);
    setExerciseToDelete(null);
  };

  const renderExerciseItem = (exercise: Exercise) => {
    // Add safety checks for exercise properties
    if (!exercise || !exercise.name) {
      console.warn('Manage Exercises: Invalid exercise data:', exercise);
      return null;
    }
    
    return (
    <View key={exercise.id} style={styles.exerciseCard}>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseDescription} numberOfLines={2}>
          {exercise.description || 'No description'}
        </Text>
        <View style={styles.exerciseDetails}>
          <Text style={styles.exerciseGroup}>{exercise.major_group || 'Uncategorized'}</Text>
          {exercise.minor_group ? (
            <Text style={styles.exerciseMinorGroup}> • {exercise.minor_group}</Text>
          ) : null}
        </View>
        <View style={styles.exerciseStats}>
          <Text style={styles.exerciseStat}>{exercise.base_sets || 0} sets</Text>
          <Text style={styles.exerciseStat}> • {exercise.base_reps || 0} reps</Text>
          <Text style={styles.exerciseStat}> • {exercise.estimated_duration || 0}min</Text>
          {exercise.bodyweight ? (
            <Text style={styles.bodyweightTag}> • Bodyweight</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.exerciseActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/edit-exercise/${exercise.id}`)}
        >
          <Ionicons name="create-outline" size={20} color="#155724" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteExercise(exercise)}
        >
          <Ionicons name="trash-outline" size={20} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading your exercises...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#155724" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Exercises</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-exercise')}
        >
          <Ionicons name="add" size={24} color="#155724" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {customExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Custom Exercises</Text>
            <Text style={styles.emptyStateText}>
              Create your own exercises to add them to your workouts.
            </Text>
            <TouchableOpacity 
              style={styles.createFirstButton}
              onPress={() => router.push('/add-exercise')}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>Create First Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {customExercises.length} custom exercise{customExercises.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {customExercises.filter(exercise => exercise && exercise.id).map(renderExerciseItem)}
          </>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteExercise}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={24} color="#dc3545" />
              <Text style={styles.deleteModalTitle}>Delete Exercise</Text>
            </View>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{exerciseToDelete?.name}"? This action cannot be undone.
            </Text>
            <Text style={styles.deleteModalWarning}>
              Note: This exercise will be removed from any existing workouts that use it.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={cancelDeleteExercise}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmButton, deleting && styles.buttonDisabled]}
                onPress={confirmDeleteExercise}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryText: {
    fontSize: 16,
    color: '#155724',
    fontWeight: '600',
    textAlign: 'center',
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseGroup: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  exerciseMinorGroup: {
    fontSize: 14,
    color: '#888',
    textTransform: 'capitalize',
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseStat: {
    fontSize: 12,
    color: '#888',
  },
  bodyweightTag: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#fee',
    borderRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#155724',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 12,
    lineHeight: 24,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#dc3545',
    marginBottom: 24,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});