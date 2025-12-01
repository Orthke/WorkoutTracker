import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  getAllExercises,
  getCurrentUser,
  getWorkoutWithExercises,
  initDatabase,
  isExerciseFavorited,
  removeExerciseFromFavorites,
  removeExercisesFromWorkout,
  updateWorkoutInDB
} from '../../utils/database';

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
  bodyweight?: boolean;
  alternates?: Exercise[];
}

interface SelectedExercise extends Exercise {
  order: number;
  alternates?: Exercise[];
}

export default function EditWorkout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const workoutId = parseInt(id as string);
  
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
  const [editExerciseModalVisible, setEditExerciseModalVisible] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<SelectedExercise | null>(null);
  const [editSets, setEditSets] = useState('');
  const [editReps, setEditReps] = useState('');
  
  // Alternates state
  const [alternatesModalVisible, setAlternatesModalVisible] = useState(false);
  const [currentExerciseForAlternates, setCurrentExerciseForAlternates] = useState<SelectedExercise | null>(null);
  const [alternateSearchQuery, setAlternateSearchQuery] = useState('');

  const muscleGroups = ['all', 'favorites', 'chest', 'arms', 'back', 'legs', 'shoulders', 'core', 'cardio'];

  useEffect(() => {
    const loadData = async () => {
      try {
        await initDatabase();
        
        // Get current user
        const user = await getCurrentUser();
        const userId = user?.username || 'default';
        
        // Get workout data
        const workout = await getWorkoutWithExercises(workoutId);
        if (workout) {
          setWorkoutName(workout.name);
          
          // Convert exercises to selected exercises with order
          const exercisesWithOrder = workout.exercises.map((exercise: Exercise, index: number) => ({
            ...exercise,
            order: index
          }));
          setSelectedExercises(exercisesWithOrder);
        }
        
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
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workoutId]);

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
    // Dismiss keyboard first
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    
    const isFavorited = favoriteExercises.has(exercise.id);
    
    // Optimistic UI update - update state immediately
    if (isFavorited) {
      setFavoriteExercises(prev => {
        const newSet = new Set(prev);
        newSet.delete(exercise.id);
        return newSet;
      });
      Toast.show({
        type: 'info',
        text1: 'Removed from Favorites',
        text2: `${exercise.name} removed from favorites`,
        visibilityTime: 1000,
      });
    } else {
      setFavoriteExercises(prev => new Set(prev).add(exercise.id));
      Toast.show({
        type: 'success',
        text1: 'Added to Favorites',
        text2: `${exercise.name} added to favorites`,
        visibilityTime: 1000,
      });
    }
    
    // Async database operation - fire and forget with error handling
    try {
      if (isFavorited) {
        removeExerciseFromFavorites(exercise.id).catch(error => {
          console.error('Error removing from favorites:', error);
          // Revert UI state if database operation failed
          setFavoriteExercises(prev => new Set(prev).add(exercise.id));
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to update favorites. Reverted.',
            visibilityTime: 3000,
          });
        });
      } else {
        addExerciseToFavorites(exercise.id).catch(error => {
          console.error('Error adding to favorites:', error);
          // Revert UI state if database operation failed
          setFavoriteExercises(prev => {
            const newSet = new Set(prev);
            newSet.delete(exercise.id);
            return newSet;
          });
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to update favorites. Reverted.',
            visibilityTime: 3000,
          });
        });
      }
    } catch (error) {
      console.error('Unexpected error in toggleFavorite:', error);
    }
  };

  const addExercise = (exercise: Exercise) => {
    // Dismiss keyboard first
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    
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
      visibilityTime: 1000,
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
      visibilityTime: 1000,
    });
    
    setDeleteExerciseModalVisible(false);
    setExerciseToDelete(null);
  };

  const cancelRemoveExercise = () => {
    setDeleteExerciseModalVisible(false);
    setExerciseToDelete(null);
  };

  const editExercise = (exercise: SelectedExercise) => {
    setExerciseToEdit(exercise);
    setEditSets((exercise.base_sets || 3).toString());
    setEditReps((exercise.base_reps || 10).toString());
    setEditExerciseModalVisible(true);
  };

  const saveExerciseEdit = () => {
    if (!exerciseToEdit) return;

    const sets = parseInt(editSets) || 3;
    const reps = parseInt(editReps) || 10;

    setSelectedExercises(prev => 
      prev.map(ex => 
        ex.id === exerciseToEdit.id 
          ? { ...ex, base_sets: sets, base_reps: reps }
          : ex
      )
    );

    Toast.show({
      type: 'success',
      text1: 'Exercise Updated!',
      text2: `${exerciseToEdit.name} was updated successfully`,
      visibilityTime: 1000,
    });

    setEditExerciseModalVisible(false);
    setExerciseToEdit(null);
    setEditSets('');
    setEditReps('');
  };

  // Alternates functions
  const openAlternatesModal = (exercise: SelectedExercise) => {
    setCurrentExerciseForAlternates(exercise);
    setAlternateSearchQuery('');
    setAlternatesModalVisible(true);
  };

  const closeAlternatesModal = () => {
    setAlternatesModalVisible(false);
    setCurrentExerciseForAlternates(null);
    setAlternateSearchQuery('');
  };

  const addAlternate = (alternateExercise: Exercise) => {
    if (!currentExerciseForAlternates) return;
    
    // Check if alternate already exists
    const existingAlternates = currentExerciseForAlternates.alternates || [];
    if (existingAlternates.some(alt => alt.id === alternateExercise.id)) {
      Toast.show({
        type: 'info',
        text1: 'Already Added',
        text2: `${alternateExercise.name} is already an alternate`,
        visibilityTime: 1000,
      });
      return;
    }
    
    // Don't allow adding the same exercise as alternate to itself
    if (alternateExercise.id === currentExerciseForAlternates.id) {
      Toast.show({
        type: 'info',
        text1: 'Cannot Add',
        text2: 'Cannot add exercise as alternate to itself',
        visibilityTime: 1000,
      });
      return;
    }
    
    // Add alternate to the exercise
    setSelectedExercises(prev => prev.map(ex => 
      ex.id === currentExerciseForAlternates.id 
        ? { ...ex, alternates: [...existingAlternates, alternateExercise] }
        : ex
    ));
    
    // Close modal immediately
    closeAlternatesModal();
    
    Toast.show({
      type: 'success',
      text1: 'Alternate Added!',
      text2: `${alternateExercise.name} added as alternate`,
      visibilityTime: 1000,
    });
  };

  const removeAlternate = (exerciseId: number, alternateId: number) => {
    setSelectedExercises(prev => prev.map(ex => 
      ex.id === exerciseId 
        ? { ...ex, alternates: (ex.alternates || []).filter(alt => alt.id !== alternateId) }
        : ex
    ));
    
    Toast.show({
      type: 'info',
      text1: 'Alternate Removed',
      text2: 'Alternate exercise was removed',
      visibilityTime: 1000,
    });
  };

  const cancelExerciseEdit = () => {
    setEditExerciseModalVisible(false);
    setExerciseToEdit(null);
    setEditSets('');
    setEditReps('');
  };

  const filteredAlternateExercises = availableExercises.filter(ex => {
    // Filter out the current exercise and any already selected alternates
    if (currentExerciseForAlternates) {
      const currentAlternateIds = currentExerciseForAlternates.alternates?.map(alt => alt.id) || [];
      if (ex.id === currentExerciseForAlternates.id || currentAlternateIds.includes(ex.id)) {
        return false;
      }
    }
    
    // Apply search filter
    const matchesSearch = alternateSearchQuery.trim() === '' || 
      ex.name.toLowerCase().includes(alternateSearchQuery.toLowerCase()) ||
      (ex.description && ex.description.toLowerCase().includes(alternateSearchQuery.toLowerCase())) ||
      ex.major_group.toLowerCase().includes(alternateSearchQuery.toLowerCase());

    return matchesSearch;
  }).slice(0, 50);

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
      
      // Update workout in database
      await updateWorkoutInDB(workoutId, workoutName.trim(), numExercises, duration);
      
      // Remove old exercises and add new ones
      await removeExercisesFromWorkout(workoutId);
      await addExercisesToWorkout(workoutId, selectedExercises);
      
      // Show success toast and navigate back
      Toast.show({
        type: 'success',
        text1: 'Workout Updated!',
        text2: `${workoutName.trim()} was updated successfully`,
        visibilityTime: 3000,
        topOffset: 100
      });
      
      router.push('/workout-list');
      
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
              {item.base_sets || 3} sets × {item.base_reps || 10} {item.bodyweight ? 'seconds' : 'reps'}
            </Text>
            <Text style={styles.selectedExerciseMuscle}>{item.major_group}</Text>
            {item.alternates && item.alternates.length > 0 && (
              <View style={styles.alternatesSection}>
                <Text style={styles.alternatesLabel}>
                  Alternates ({item.alternates.length}):
                </Text>
                <View style={styles.alternatesList}>
                  {item.alternates.map((alternate, index) => (
                    <View key={`${item.id}-alternate-${alternate.id}-${index}`} style={styles.alternateItem}>
                      <Text style={styles.alternateName}>{alternate.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeAlternate(item.id, alternate.id)}
                        style={styles.removeAlternateButton}
                      >
                        <Ionicons name="close-circle" size={16} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
          <View style={styles.exerciseCardActions}>
            <TouchableOpacity
              onPress={() => openAlternatesModal(item)}
              style={styles.alternatesButton}
            >
              <Ionicons name="swap-horizontal" size={16} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => editExercise(item)}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeExercise(item.id)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
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
        <Text style={styles.loadingText}>Loading workout...</Text>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <GestureHandlerRootView style={styles.flex1}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/workout-list')}>
          <Ionicons name="arrow-back" size={24} color="#155724" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Workout</Text>
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
      <View style={styles.nameSection}>
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

      <View style={styles.flex1}>
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
          showsVerticalScrollIndicator={true}
        />
      </View>

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
            />
            
            <ScrollView horizontal style={styles.muscleGroupFilter} showsHorizontalScrollIndicator={false}>
              {muscleGroups.map(group => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.muscleGroupButton,
                    selectedMuscleGroup === group && styles.muscleGroupButtonActive
                  ]}
                  onPress={() => {
                    // Dismiss keyboard first
                    if (Platform.OS !== 'web') {
                      Keyboard.dismiss();
                    }
                    setSelectedMuscleGroup(group);
                  }}
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

      {/* Edit Exercise Modal */}
      <Modal
        visible={editExerciseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelExerciseEdit}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.editModalSafeArea}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Ionicons name="create" size={24} color="#007AFF" />
                <Text style={styles.editModalTitle}>Edit Exercise</Text>
              </View>
              <Text style={styles.editModalExerciseName}>{exerciseToEdit?.name}</Text>
              
              <View style={styles.editInputContainer}>
                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>Sets</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editSets}
                    onChangeText={setEditSets}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="3"
                  />
                </View>
                
                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{exerciseToEdit?.bodyweight ? 'Seconds' : 'Reps'}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editReps}
                    onChangeText={setEditReps}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder={exerciseToEdit?.bodyweight ? '30' : '10'}
                  />
                </View>
              </View>
              
              <View style={styles.editModalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={cancelExerciseEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveEditButton}
                  onPress={saveExerciseEdit}
                >
                  <Text style={styles.saveEditButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Alternates Modal */}
      <Modal
        visible={alternatesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAlternatesModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Alternates</Text>
            <TouchableOpacity 
              onPress={closeAlternatesModal}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Add alternate exercises for &ldquo;{currentExerciseForAlternates?.name}&rdquo;
          </Text>
          
          <View style={styles.filterSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={alternateSearchQuery}
              onChangeText={setAlternateSearchQuery}
            />
          </View>
          
          <ScrollView 
            style={styles.exercisesList}
            showsVerticalScrollIndicator={true}
          >
                {filteredAlternateExercises.map(exercise => {
                  const isFavorited = favoriteExercises.has(exercise.id);
                  
                  return (
                    <View key={exercise.id} style={styles.exerciseCard}>
                      <TouchableOpacity
                        style={styles.exerciseInfo}
                        onPress={() => addAlternate(exercise)}
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
                        <TouchableOpacity onPress={() => addAlternate(exercise)}>
                          <Ionicons name="add-circle" size={24} color="#155724" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                {filteredAlternateExercises.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No exercises found</Text>
                    <Text style={styles.emptyStateSubtext}>Try adjusting your search</Text>
                  </View>
                )}
          </ScrollView>
        </SafeAreaView>
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
  scrollContainer: {
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
    color: '#155724',
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
    paddingHorizontal: 16,
    paddingBottom: 34, // Extra padding for safe area
  },
  nameSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
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
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 8,
    marginRight: 8,
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
  exerciseCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 4,
    marginRight: 8,
  },
  editModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: '90%',
    maxWidth: '95%',
  },
  editModalSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  editModalExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 20,
    textAlign: 'center',
  },
  editInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  editInputGroup: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  editInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    width: 100,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
    width: '100%',
  },
  pickerItem: {
    fontSize: 18,
    color: '#333',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    minWidth: 80,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveEditButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveEditButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Alternates styles
  alternatesButton: {
    backgroundColor: '#e8f4f8',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  alternatesSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0e7ff',
  },
  alternatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  alternatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  alternateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  alternateName: {
    fontSize: 11,
    color: '#007AFF',
    marginRight: 4,
  },
  removeAlternateButton: {
    marginLeft: 2,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  }
});