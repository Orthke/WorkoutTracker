import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, getUserExerciseHistory, getUserWorkoutHistory } from '../../utils/database';

interface WorkoutRecord {
  id: number;
  workout_id: number;
  workout_name: string;
  duration: number;
  completed_at: string;
  comments?: string;
  session_guid?: string | null;
}

interface ExerciseCompletion {
  id: number;
  exercise_id: number;
  exercise_name: string;
  sets_completed: number;
  weight_per_set: number[];
  difficulty_per_set: string[];
  reps_per_set: number[];
  comments?: string;
  completed_at: string;
  major_group: string;
  description?: string;
  bodyweight?: boolean;
  workout_session_id?: string;
}

interface WorkoutSummary {
  id: number;
  workout_name: string;
  duration: number;
  completed_at: string;
  comments?: string;
  exercises: ExerciseCompletion[];
}

export default function WorkoutSummaryPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; date?: string }>();
  const [loading, setLoading] = useState(true);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | null>(null);

  useEffect(() => {
    const loadWorkoutSummary = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const user = await getCurrentUser();
        const userId = user?.username || user?.id || 'default';
        
        // Get workout history to find the specific workout record
        const workoutHistory = await getUserWorkoutHistory(userId, 100);
        const workoutRecord = workoutHistory.find((w: WorkoutRecord) => w.id === parseInt(id));
        
        if (!workoutRecord) {
          setLoading(false);
          return;
        }

        // Get exercise completions for this specific workout
        // First, try to get exercises by workout session ID if available
        const userExercises = await getUserExerciseHistory(userId, 1000);
        
        let workoutExercises: ExerciseCompletion[] = [];
        
        // Try to find exercises with exact workout_session_id match using the workout's session GUID
        if (workoutRecord.session_guid) {
          const guidBasedExercises = userExercises.filter((exercise: ExerciseCompletion) => {
            return exercise.workout_session_id === workoutRecord.session_guid;
          });
          
          if (guidBasedExercises.length > 0) {
            workoutExercises = guidBasedExercises;
          }
        }
        
        // Fallback: If no GUID match or no GUID stored, use time-based filtering
        if (workoutExercises.length === 0) {
          const workoutCompletionTime = new Date(workoutRecord.completed_at).getTime();
          const timeWindow = 12 * 60 * 60 * 1000; // 12 hour window
          
          const timeBasedExercises = userExercises.filter((exercise: ExerciseCompletion) => {
            const exerciseTime = new Date(exercise.completed_at).getTime();
            const timeDiff = Math.abs(workoutCompletionTime - exerciseTime);
            return timeDiff <= timeWindow;
          });
          
          if (timeBasedExercises.length > 0) {
            workoutExercises = timeBasedExercises;
          } else {
            // Final fallback to date-based matching
            const workoutDate = workoutRecord.completed_at.split(/[T\s]/)[0];
            workoutExercises = userExercises.filter((exercise: ExerciseCompletion) => {
              const exerciseDate = exercise.completed_at.split(/[T\s]/)[0];
              return exerciseDate === workoutDate;
            });
          }
        }

        // Create summary with actual workout data
        const summary: WorkoutSummary = {
          id: workoutRecord.id,
          workout_name: workoutRecord.workout_name,
          duration: workoutRecord.duration,
          completed_at: workoutRecord.completed_at,
          comments: workoutRecord.comments || '',
          exercises: workoutExercises
        };
        
        setWorkoutSummary(summary);
      } catch (error) {
        console.error('Error loading workout summary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkoutSummary();
  }, [id]);

  const formatDuration = (duration: number) => {
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const formatWeight = (weights: any) => {
    // Handle both array and non-array data (in case it's a JSON string or single value)
    let weightArray: number[] = [];
    
    if (Array.isArray(weights)) {
      weightArray = weights;
    } else if (typeof weights === 'string') {
      try {
        weightArray = JSON.parse(weights);
      } catch {
        return 'No weight recorded';
      }
    } else if (typeof weights === 'number') {
      weightArray = [weights];
    } else {
      return 'No weight recorded';
    }
    
    if (!weightArray || weightArray.length === 0) return 'No weight recorded';
    // Filter out NaN values and provide default weight
    const validWeights = weightArray.filter(w => !isNaN(w) && w !== null && w !== undefined);
    if (validWeights.length === 0) return '50 lbs'; // Default weight
    
    const uniqueWeights = [...new Set(validWeights)];
    if (uniqueWeights.length === 1) {
      return `${uniqueWeights[0]} lbs`;
    }
    return `${Math.min(...validWeights)} - ${Math.max(...validWeights)} lbs`;
  };

  const formatReps = (reps: any, isBodyweight?: boolean) => {
    // Handle both array and non-array data (in case it's a JSON string or single value)
    let repsArray: number[] = [];
    
    if (Array.isArray(reps)) {
      repsArray = reps;
    } else if (typeof reps === 'string') {
      try {
        repsArray = JSON.parse(reps);
      } catch {
        return isBodyweight ? 'No duration recorded' : 'No reps recorded';
      }
    } else if (typeof reps === 'number') {
      repsArray = [reps];
    } else {
      return isBodyweight ? 'No duration recorded' : 'No reps recorded';
    }
    
    if (!repsArray || repsArray.length === 0) return isBodyweight ? 'No duration recorded' : 'No reps recorded';
    // Filter out NaN values and provide default reps
    const validReps = repsArray.filter(r => !isNaN(r) && r !== null && r !== undefined);
    if (validReps.length === 0) return isBodyweight ? '30 seconds' : '10 reps'; // Default reps or seconds
    
    const uniqueReps = [...new Set(validReps)];
    const unit = isBodyweight ? 'seconds' : 'reps';
    if (uniqueReps.length === 1) {
      return `${uniqueReps[0]} ${unit}`;
    }
    return `${Math.min(...validReps)} - ${Math.max(...validReps)} ${unit}`;
  };

  const formatDifficulty = (difficulties: any) => {
    // Handle both array and non-array data (in case it's a JSON string or single value)
    let difficultiesArray: any[] = [];
    
    if (Array.isArray(difficulties)) {
      difficultiesArray = difficulties;
    } else if (typeof difficulties === 'string') {
      try {
        difficultiesArray = JSON.parse(difficulties);
      } catch {
        return 'No effort recorded';
      }
    } else if (difficulties !== null && difficulties !== undefined) {
      difficultiesArray = [difficulties];
    } else {
      return 'No effort recorded';
    }
    
    if (!difficultiesArray || difficultiesArray.length === 0) return 'No effort recorded';
    
    // Filter out null/undefined values and convert to string
    const validDifficulties = difficultiesArray
      .filter(d => d !== null && d !== undefined)
      .map(d => String(d));
      
    if (validDifficulties.length === 0) return 'No effort recorded';
    
    const uniqueDifficulties = [...new Set(validDifficulties)];
    
    // Return just the numbers, no mapping to words to prevent text clipping
    return uniqueDifficulties.length > 0 ? uniqueDifficulties.join(', ') : 'No effort recorded';
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workout summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workoutSummary) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <Ionicons name="fitness-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Workout summary not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#155724" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Workout Summary</Text>
            <Text style={styles.headerSubtitle}>
              {new Date(workoutSummary.completed_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Workout Info */}
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutName}>{workoutSummary.workout_name}</Text>
          {workoutSummary.duration > 0 && (
            <Text style={styles.workoutDuration}>
              Duration: {formatDuration(workoutSummary.duration)}
            </Text>
          )}
          {workoutSummary.comments && (
            <Text style={styles.workoutComments}>{workoutSummary.comments}</Text>
          )}
        </View>

        {/* Exercises */}
        <ScrollView 
          style={styles.exercisesList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.exercisesListContent}
        >
          {workoutSummary.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                <View style={styles.exerciseBadge}>
                  <Text style={styles.exerciseBadgeText}>{exercise.major_group}</Text>
                </View>
              </View>
              
              {exercise.description && (
                <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              )}
              
              <View style={styles.exerciseStats}>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="barbell-outline" size={16} color="#155724" />
                    <Text style={styles.statLabel}>Sets</Text>
                    <Text style={styles.statValue}>{exercise.sets_completed}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="fitness-outline" size={16} color="#155724" />
                    <Text style={styles.statLabel}>Weight</Text>
                    <Text style={styles.statValue}>{formatWeight(exercise.weight_per_set)}</Text>
                  </View>
                </View>
                
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="repeat-outline" size={16} color="#155724" />
                    <Text style={styles.statLabel}>{exercise.bodyweight ? 'Seconds' : 'Reps'}</Text>
                    <Text style={styles.statValue}>{formatReps(exercise.reps_per_set, exercise.bodyweight)}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="speedometer-outline" size={16} color="#155724" />
                    <Text style={styles.statLabel}>Effort</Text>
                    <Text style={styles.statValue}>{formatDifficulty(exercise.difficulty_per_set)}</Text>
                  </View>
                </View>
              </View>
              
              {exercise.comments && (
                <View style={styles.exerciseCommentsContainer}>
                  <Text style={styles.exerciseCommentsLabel}>Notes:</Text>
                  <Text style={styles.exerciseComments}>{exercise.comments}</Text>
                </View>
              )}
            </View>
          ))}
          
          {workoutSummary.exercises.length === 0 && (
            <View style={styles.noExercisesContainer}>
              <Ionicons name="fitness-outline" size={48} color="#ccc" />
              <Text style={styles.noExercisesText}>No exercise details available</Text>
              <Text style={styles.noExercisesSubtext}>
                This workout was recorded without individual exercise tracking
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#155724',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#155724',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  workoutInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  workoutDuration: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  workoutComments: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 22,
  },
  exercisesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  exercisesListContent: {
    paddingBottom: 100, // Extra space for safe area and system buttons
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
    flex: 1,
  },
  exerciseBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseBadgeText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  exerciseStats: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginLeft: 'auto',
  },
  exerciseCommentsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  exerciseCommentsLabel: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseComments: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noExercisesContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noExercisesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  noExercisesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});