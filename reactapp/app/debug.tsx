import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../components/CustomNavigation';
import {
  clearAllUserData,
  clearUserStats,
  debugUsers,
  debugUserWorkouts,
  deleteExerciseCompletion,
  getAllExercises,
  getCurrentUser,
  getUserExerciseHistory,
  getUserWorkoutHistory,
  initDatabase,
  repairSystemWorkouts
} from '../utils/database';

interface Exercise {
  id: number;
  name: string;
  major_group: string;
}

interface UserExercise {
  id: number;
  user_id: string;
  exercise_id: number;
  sets_completed: number;
  weight_per_set: number[];
  difficulty_per_set: number[];
  reps_per_set: number[];
  comments: string;
  created_at: string;
  exercise_name?: string;
  exercise_group?: string;
}

interface UserWorkout {
  id: number;
  user_id: string;
  workout_id: number;
  workout_name: string;
  duration: number;
  comments: string;
  completed_at: string;
}

export default function DebugScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userExercises, setUserExercises] = useState<UserExercise[]>([]);
  const [userWorkouts, setUserWorkouts] = useState<UserWorkout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeTab, setActiveTab] = useState<'exercises' | 'workouts'>('exercises');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await initDatabase();
      
      // Get current user
      const currentUser = await getCurrentUser();
      const userId = currentUser?.username || currentUser?.id || 'default';
      
      // Load user exercise history for current user
      const history = await getUserExerciseHistory(userId, 100);
      
      // Load user workout history for current user
      const workoutHistory = await getUserWorkoutHistory(userId, 100);
      
      // Load all exercises to match names
      const allExercises = await getAllExercises();
      setExercises(allExercises);
      
      // Enhance user exercises with exercise names  
      const enhancedHistory = (history as UserExercise[]).map((ue: UserExercise) => {
        const exercise = (allExercises as Exercise[]).find((ex: Exercise) => ex.id === ue.exercise_id);
        return {
          ...ue,
          exercise_name: exercise?.name || 'Unknown Exercise',
          exercise_group: exercise?.major_group || 'Unknown',
        };
      });
      
      setUserExercises(enhancedHistory);
      setUserWorkouts(workoutHistory);
    } catch (error) {
      console.error('Error loading debug data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load debug data',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearUserStats = async () => {
    console.log('🔥 Clear User Stats button pressed!');
    // Bypass Alert for testing
    console.log('🔥 Clear Stats confirmed, calling clearUserStats...');
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.username || currentUser?.id || 'default';
      console.log('🔥 Current user:', currentUser);
      console.log('🔥 Using userId:', userId);
      
      const result = await clearUserStats(userId);
      console.log('🔥 clearUserStats result:', result);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Stats Cleared',
          text2: 'User stats and data cleared successfully',
          visibilityTime: 2000,
        });
        // Reload the data
        loadData();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to clear user stats',
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('🔥 Error clearing user stats:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to clear user stats',
        visibilityTime: 2000,
      });
    }
  };

  const handleDeleteExercise = async (exerciseId: number, exerciseName: string) => {
    Alert.alert(
      'Delete Exercise Record',
      `Are you sure you want to delete the record for "${exerciseName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current user
              const currentUser = await getCurrentUser();
              const userId = currentUser?.username || currentUser?.id || 'default';
              
              const result = await deleteExerciseCompletion(userId, exerciseId);
              if (result.success) {
                Toast.show({
                  type: 'success',
                  text1: 'Deleted',
                  text2: `Record for ${exerciseName} deleted`,
                  visibilityTime: 2000,
                });
                loadData(); // Refresh data
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              console.error('Error deleting exercise:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete exercise record',
                visibilityTime: 2000,
              });
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatArrayData = (data: any) => {
    if (Array.isArray(data)) {
      return data.join(', ');
    }
    return String(data);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading debug data...</Text>
        </View>
        <CustomNavigation active="debug" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#155724" />
          </TouchableOpacity>
          <Text style={styles.title}>Debug: User Data</Text>
          <TouchableOpacity onPress={loadData}>
            <Ionicons name="refresh" size={24} color="#155724" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'exercises' && styles.activeTab]}
            onPress={() => setActiveTab('exercises')}
          >
            <Text style={[styles.tabText, activeTab === 'exercises' && styles.activeTabText]}>
              Exercises ({userExercises.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'workouts' && styles.activeTab]}
            onPress={() => setActiveTab('workouts')}
          >
            <Text style={[styles.tabText, activeTab === 'workouts' && styles.activeTabText]}>
              Workouts ({userWorkouts.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          {activeTab === 'exercises' ? (
            <>
              <Text style={styles.statsText}>
                Total Exercise Records: {userExercises.length}
              </Text>
              <Text style={styles.statsText}>
                Total Exercises Available: {exercises.length}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.statsText}>
                Total Workout Records: {userWorkouts.length}
              </Text>
              {userWorkouts.length > 0 && (
                <Text style={styles.statsText}>
                  Total Minutes: {userWorkouts.reduce((sum, w) => sum + w.duration, 0)}
                </Text>
              )}
            </>
          )}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={async () => {
              try {
                await debugUsers();
                Toast.show({
                  type: 'info',
                  text1: 'Debug Complete',
                  text2: 'Check console for users table data',
                  visibilityTime: 2000,
                });
              } catch (error) {
                console.error('Error debugging users:', error);
              }
            }}
          >
            <Text style={styles.debugButtonText}>Debug Users Table</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.debugButton, { marginTop: 8 }]}
            onPress={async () => {
              try {
                await debugUserWorkouts();
                Toast.show({
                  type: 'info',
                  text1: 'Debug Complete',
                  text2: 'Check console for user workouts data',
                  visibilityTime: 2000,
                });
              } catch (error) {
                console.error('Error debugging user workouts:', error);
              }
            }}
          >
            <Text style={styles.debugButtonText}>Debug Workouts Table</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.debugButton, { marginTop: 8, backgroundColor: '#f39c12' }]}
            onPress={handleClearUserStats}
          >
            <Text style={styles.debugButtonText}>Clear User Stats & Data</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.debugButton, { marginTop: 8, backgroundColor: '#27ae60' }]}
            onPress={async () => {
              try {
                console.log('🔧 Repair System Workouts button pressed');
                const result = await repairSystemWorkouts();
                console.log('🔧 repairSystemWorkouts result:', result);
                
                if (result.success) {
                  Toast.show({
                    type: 'success',
                    text1: 'System Workouts Repaired',
                    text2: result.message,
                    visibilityTime: 3000,
                  });
                } else {
                  Toast.show({
                    type: 'error',
                    text1: 'Repair Failed',
                    text2: result.error || 'Failed to repair system workouts',
                    visibilityTime: 3000,
                  });
                }
              } catch (error) {
                console.error('🔧 Error repairing system workouts:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to repair system workouts',
                  visibilityTime: 3000,
                });
              }
            }}
          >
            <Text style={styles.debugButtonText}>Repair System Workouts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.debugButton, { marginTop: 8, backgroundColor: '#e74c3c' }]}
            onPress={async () => {
              console.log('🔥 Clear All Data button pressed!');
              // Bypass Alert for testing
              console.log('🔥 Clear All confirmed, calling clearAllUserData...');
              try {
                const result = await clearAllUserData();
                console.log('🔥 clearAllUserData result:', result);
                if (result.success) {
                  Toast.show({
                    type: 'success',
                    text1: 'Data Cleared',
                    text2: 'All user data has been reset',
                    visibilityTime: 2000,
                  });
                  // Reload the debug data
                  await loadData();
                } else {
                  throw new Error('Failed to clear data');
                }
              } catch (error) {
                console.error('🔥 Error clearing user data:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to clear user data',
                  visibilityTime: 2000,
                });
              }
            }}
          >
            <Text style={styles.debugButtonText}>Clear All User Data</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
          userExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No exercise records found</Text>
              <Text style={styles.emptyStateSubtext}>Complete some exercises to see them here</Text>
            </View>
          ) : (
            <View style={styles.exercisesList}>
              {userExercises.map((userExercise, index) => (
                <View key={index} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{userExercise.exercise_name}</Text>
                      <Text style={styles.exerciseGroup}>{userExercise.exercise_group}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteExercise(
                          userExercise.exercise_id,
                          userExercise.exercise_name || 'Unknown'
                        )
                      }
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Sets: </Text>{userExercise.sets_completed}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Weights: </Text>{formatArrayData(userExercise.weight_per_set)}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Difficulties: </Text>{formatArrayData(userExercise.difficulty_per_set)}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Reps: </Text>{formatArrayData(userExercise.reps_per_set)}
                    </Text>
                    {userExercise.comments && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Notes: </Text>{userExercise.comments}
                      </Text>
                    )}
                    <Text style={styles.dateText}>Completed: {formatDate(userExercise.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {/* Workouts Tab */}
        {activeTab === 'workouts' && (
          userWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No workout records found</Text>
              <Text style={styles.emptyStateSubtext}>Complete some workouts to see them here</Text>
            </View>
          ) : (
            <View style={styles.exercisesList}>
              {userWorkouts.map((userWorkout, index) => (
                <View key={index} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{userWorkout.workout_name}</Text>
                      <Text style={styles.exerciseGroup}>Workout ID: {userWorkout.workout_id}</Text>
                    </View>
                  </View>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Duration:</Text> {userWorkout.duration} minutes
                    </Text>
                    {userWorkout.comments && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Comments:</Text> {userWorkout.comments}
                      </Text>
                    )}
                    <Text style={styles.dateText}>Completed: {formatDate(userWorkout.completed_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <CustomNavigation active="debug" />
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#155724',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#155724',
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  exercisesList: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  exerciseGroup: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  exerciseDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#155724',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  debugButton: {
    backgroundColor: '#155724',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});