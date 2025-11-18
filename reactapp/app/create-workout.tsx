import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  addExercisesToWorkout,
  addExerciseToFavorites,
  addWorkoutToDB,
  getAllExercises,
  getCurrentUser,
  initDatabase,
  isExerciseFavorited,
  removeExerciseFromFavorites
} from '../utils/database';

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
}

interface SelectedExercise extends Exercise {
  order: number;
}

export default function CreateWorkout() {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteExerciseModalVisible, setDeleteExerciseModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<SelectedExercise | null>(null);
  const [favoriteExercises, setFavoriteExercises] = useState<Set<number>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>('default');

  const muscleGroups = ['all', 'favorites', 'chest', 'arms', 'back', 'legs', 'shoulders', 'core', 'cardio'];

  useEffect(() => {
    const loadExercises = async () => {
      try {
        await initDatabase();
        
        // Get current user
        const user = await getCurrentUser();
        const userId = user?.username || 'default';
        setCurrentUserId(userId);
        
        // Get all exercises including user's custom exercises
        const exercises = await getAllExercises(userId);
        setAvailableExercises(exercises);
        setFilteredExercises(exercises);
        
        // Load favorite exercises
        const favoritesSet = new Set<number>();
        for (const exercise of exercises) {
          const isFavorited = await isExerciseFavorited(exercise.id);
          if (isFavorited) {
            favoritesSet.add(exercise.id);
          }
        }
        setFavoriteExercises(favoritesSet);
      } catch (error) {
        console.error('Error loading exercises:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  useEffect(() => {
    let filtered = availableExercises;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.major_group.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by muscle group
    if (selectedMuscleGroup !== 'all') {
      if (selectedMuscleGroup === 'favorites') {
        filtered = filtered.filter(exercise => favoriteExercises.has(exercise.id));
      } else {
        filtered = filtered.filter(exercise => {
          const exerciseMuscleGroup = exercise.major_group.toLowerCase();
          const selectedGroup = selectedMuscleGroup.toLowerCase();
          
          // Handle some special cases for muscle group matching
          if (selectedGroup === 'shoulders') {
            return exerciseMuscleGroup.includes('shoulder') || exerciseMuscleGroup.includes('deltoid');
          } else if (selectedGroup === 'core') {
            return exerciseMuscleGroup.includes('core') || exerciseMuscleGroup.includes('abs');
          }
          
          return exerciseMuscleGroup === selectedGroup || exerciseMuscleGroup.includes(selectedGroup);
        });
      }
    }

    // Remove already selected exercises
    filtered = filtered.filter(exercise =>
      !selectedExercises.find(selected => selected.id === exercise.id)
    );

    setFilteredExercises(filtered);
  }, [searchQuery, selectedMuscleGroup, availableExercises, selectedExercises, favoriteExercises]);

  const toggleFavorite = async (exercise: Exercise) => {
    try {
      const isFavorited = favoriteExercises.has(exercise.id);
      
      if (isFavorited) {
        await removeExerciseFromFavorites(exercise.id);
        setFavoriteExercises(prev => {
          const newSet = new Set(prev);
          newSet.delete(exercise.id);
          return newSet;
        });
        Toast.show({
          type: 'info',
          text1: 'Removed from Favorites',
          text2: `${exercise.name} was removed from favorites`,
          visibilityTime: 2000,
        });
      } else {
        await addExerciseToFavorites(exercise.id);
        setFavoriteExercises(prev => new Set(prev).add(exercise.id));
        Toast.show({
          type: 'success',
          text1: 'Exercise Favorited',
          text2: `${exercise.name} was added to favorites`,
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update favorite',
        visibilityTime: 2000,
      });
    }
  };

  const addExercise = (exercise: Exercise) => {
    const newExercise: SelectedExercise = {
      ...exercise,
      order: selectedExercises.length
    };
    setSelectedExercises(prev => [...prev, newExercise]);
    
    // Show success toast
    Toast.show({
      type: 'success',
      text1: 'Exercise Added!',
      text2: `${exercise.name} was added to your workout`,
      visibilityTime: 2000,
    });
  };

  const removeExercise = (exerciseId: number) => {
    const exercise = selectedExercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      setExerciseToDelete(exercise);
      setDeleteExerciseModalVisible(true);
    }
  };

  const confirmRemoveExercise = () => {
    if (!exerciseToDelete) return;
    
    setSelectedExercises(prev => 
      prev.filter(ex => ex.id !== exerciseToDelete.id)
        .map((ex, index) => ({ ...ex, order: index }))
    );
    
    Toast.show({
      type: 'info',
      text1: 'Exercise Removed',
      text2: `${exerciseToDelete.name} was removed from your workout`,
      visibilityTime: 2000,
    });
    
    setDeleteExerciseModalVisible(false);
    setExerciseToDelete(null);
  };

  const cancelRemoveExercise = () => {
    setDeleteExerciseModalVisible(false);
    setExerciseToDelete(null);
  };

  const onDragEnd = ({ data }: DragEndParams<SelectedExercise>) => {
    setSelectedExercises(data.map((item, index) => ({ ...item, order: index })));
  };

  const calculateWorkoutDuration = () => {
    return selectedExercises.reduce((total, exercise) => {
      return total + (exercise.estimated_duration || 10);
    }, 0);
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    try {
      setSaving(true);
      
      // Calculate duration and exercise count
      const duration = calculateWorkoutDuration();
      const numExercises = selectedExercises.length;
      
      // Add workout to database
      const workoutId = await addWorkoutToDB(workoutName.trim(), numExercises, duration);
      
      // Add exercises to workout_exercises join table
      await addExercisesToWorkout(workoutId, selectedExercises);
      
      // Show success toast and navigate back
      Toast.show({
        type: 'success',
        text1: 'Workout Saved!',
        text2: `${workoutName.trim()} was created successfully`,
        visibilityTime: 3000,
      });
      
      router.push('/');
      
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderSelectedExercise = ({ item, drag, isActive }: RenderItemParams<SelectedExercise>) => {
    return (
      <View style={[styles.selectedExerciseCard, isActive && styles.selectedExerciseCardActive]}>
        <View style={styles.selectedExerciseContent}>
          <TouchableOpacity 
            onPressIn={drag}
            style={styles.dragHandleContainer}
            activeOpacity={1}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="reorder-three" size={28} color="#666" style={styles.dragHandle} />
          </TouchableOpacity>
          <View style={styles.selectedExerciseInfo}>
            <Text style={styles.selectedExerciseName}>{item.name}</Text>
            <Text style={styles.selectedExerciseDetails}>
              {item.base_sets || 3} sets × {item.base_reps || 10} reps
            </Text>
            <Text style={styles.selectedExerciseMuscle}>{item.major_group}</Text>
          </View>
          <TouchableOpacity
            onPress={() => removeExercise(item.id)}
            style={styles.removeButton}
          >
            <Ionicons name="close-circle" size={24} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAvailableExercise = (exercise: Exercise) => {
    const isFavorited = favoriteExercises.has(exercise.id);
    
    return (
      <View key={exercise.id} style={styles.exerciseCard}>
        <TouchableOpacity
          style={styles.exerciseInfo}
          onPress={() => addExercise(exercise)}
        >
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDescription}>{exercise.description}</Text>
          <Text style={styles.exerciseMuscle}>{exercise.major_group}</Text>
        </TouchableOpacity>
        <View style={styles.exerciseActions}>
          <TouchableOpacity
            onPress={() => toggleFavorite(exercise)}
            style={styles.favoriteButton}
          >
            <Ionicons 
              name={isFavorited ? "star" : "star-outline"} 
              size={20} 
              color={isFavorited ? "#FFD700" : "#ccc"} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => addExercise(exercise)}>
            <Ionicons name="add-circle" size={24} color="#155724" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#155724" />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </SafeAreaView>
    );
  }

  // Render header content for DraggableFlatList
  const renderHeader = () => (
    <View>
      {/* Section Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Selected Exercises ({selectedExercises.length})
        </Text>
        {selectedExercises.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No exercises added yet</Text>
            <Text style={styles.emptyStateSubtext}>Tap the button below to add exercises</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render footer content for DraggableFlatList
  const renderFooter = () => (
    <View>
      {selectedExercises.length > 0 && (
        <View style={styles.workoutStats}>
          <Text style={styles.statsText}>
            Duration: ~{calculateWorkoutDuration()} minutes
          </Text>
        </View>
      )}

      {/* Add Exercises Button */}
      <TouchableOpacity
        style={styles.addExercisesButton}
        onPress={() => setShowExerciseModal(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addExercisesButtonText}>Add Exercises</Text>
      </TouchableOpacity>
      <View style={{ height: 100 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <GestureHandlerRootView style={styles.flex1}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Ionicons name="arrow-back" size={24} color="#155724" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Workout</Text>
        <TouchableOpacity
          onPress={saveWorkout}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Workout Name Input - moved outside renderHeader to prevent keyboard dismissal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Name</Text>
        <TextInput
          style={styles.nameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Enter workout name..."
          maxLength={50}
          autoCorrect={false}
          autoCapitalize="words"
        />
      </View>

      <DraggableFlatList
        data={selectedExercises}
        onDragEnd={onDragEnd}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSelectedExercise}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.content}
        autoscrollThreshold={80}
        autoscrollSpeed={200}
        activationDistance={0}
        dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercises</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search and Filter */}
          <View style={styles.filterSection}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus={false}
              blurOnSubmit={false}
            />
            
            <ScrollView horizontal style={styles.muscleGroupFilter} showsHorizontalScrollIndicator={false}>
              {muscleGroups.map(group => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.muscleGroupButton,
                    selectedMuscleGroup === group && styles.muscleGroupButtonActive
                  ]}
                  onPress={() => setSelectedMuscleGroup(group)}
                >
                  <Text style={[
                    styles.muscleGroupButtonText,
                    selectedMuscleGroup === group && styles.muscleGroupButtonTextActive
                  ]}>
                    {group.charAt(0).toUpperCase() + group.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Exercises Count Header */}
          <View style={styles.exercisesHeader}>
            <Text style={styles.exercisesCountText}>
              {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'} found
            </Text>
          </View>

          {/* Available Exercises */}
          <ScrollView style={styles.exercisesList}>
            {filteredExercises.map(renderAvailableExercise)}
            {filteredExercises.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No exercises found</Text>
                <Text style={styles.emptyStateSubtext}>Try adjusting your search or filter</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Delete Exercise Confirmation Modal */}
      <Modal
        visible={deleteExerciseModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRemoveExercise}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={24} color="#e74c3c" />
              <Text style={styles.deleteModalTitle}>Remove Exercise</Text>
            </View>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to remove &ldquo;{exerciseToDelete?.name}&rdquo; from this workout?
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={cancelRemoveExercise}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteConfirmButton}
                onPress={confirmRemoveExercise}
              >
                <Text style={styles.deleteConfirmButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  flex1: {
    flex: 1,
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724'
  },
  saveButton: {
    backgroundColor: '#155724',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  selectedExercisesContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  selectedExerciseCard: {
    backgroundColor: '#f8f9fa',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#155724',
  },
  selectedExerciseCardActive: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.02 }],
    zIndex: 1000,
  },
  selectedExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dragHandleContainer: {
    padding: 16,
    marginRight: 8,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
    minWidth: 44,
    minHeight: 44,
  },
  dragHandle: {
    marginRight: 12,
  },
  webMoveButtons: {
    flexDirection: 'column',
    marginRight: 12,
  },
  moveButton: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  selectedExerciseInfo: {
    flex: 1,
  },
  selectedExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  selectedExerciseDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  selectedExerciseMuscle: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 4,
  },
  workoutStats: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
  },
  statsText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  addExercisesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#155724',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addExercisesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  muscleGroupFilter: {
    flexDirection: 'row',
  },
  muscleGroupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  muscleGroupButtonActive: {
    backgroundColor: '#155724',
  },
  muscleGroupButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  muscleGroupButtonTextActive: {
    color: '#fff',
  },
  exercisesHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  exercisesCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    textAlign: 'center',
  },
  exercisesList: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 4,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  exerciseMuscle: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
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
  deleteConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});