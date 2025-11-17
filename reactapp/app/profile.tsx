import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../components/CustomNavigation';
import {
    clearAndRegenerateExercises,
    createUser,
    getCurrentUser,
    getLatestUserMeasurement,
    getUserExerciseStats,
    recalculateUserStatsFromTables,
    recordUserMeasurement
} from '../utils/database';

interface User {
  id: number;
  username: string;
  created_at: string;
  last_active: string;
  total_workouts: number;
  total_exercises: number;
  total_sets?: number;
  tons_lifted?: number;
  total_workout_minutes: number;
  current_streak: number;
  settings: object;
  is_active: number;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState('150');
  const [selectedBodyFat, setSelectedBodyFat] = useState('15');
  const [includeBodyFat, setIncludeBodyFat] = useState(true);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [userStats, setUserStats] = useState({
    total_workouts: 0,
    total_exercises: 0,
    total_sets: 0,
    tons_lifted: 0,
    total_workout_minutes: 0,
    current_streak: 0
  });

  // Refresh user data when screen comes into focus
  const loadCurrentUser = useCallback(async () => {
    try {
      console.log('Loading current user...');
      const user = await getCurrentUser();
      console.log('Current user loaded:', user);
      
      if (user) {
        setCurrentUser(user);
        
        let userForStats = user; // Default to original user
        
        // If total_workout_minutes is 0 or undefined, trigger a recalculation
        const userId = (user.username || user.id || 'default').toString();
        if (!user.total_workout_minutes || user.total_workout_minutes === 0) {
          console.log('Total workout minutes is 0, triggering recalculation...');
          const recalcResult = await recalculateUserStatsFromTables(userId);
          if (recalcResult && recalcResult.success && recalcResult.stats) {
            // Use the calculated stats directly
            console.log('Using recalculated stats directly:', recalcResult.stats);
            userForStats = {
              ...user,
              ...recalcResult.stats
            };
            // Also update the current user state
            setCurrentUser(userForStats);
          }
        }
        
        // Get comprehensive exercise statistics
        //console.log('Loading user stats for:', user.username || 'default');
        const exerciseStats = await getUserExerciseStats(user.username || 'default');
        //console.log('Exercise stats loaded:', exerciseStats);
        
        const newStats = {
          total_workouts: userForStats.total_workouts || 0,
          total_exercises: exerciseStats.totalExercises || 0,
          total_sets: exerciseStats.totalSets || 0,
          tons_lifted: exerciseStats.tonsLifted || 0,
          total_workout_minutes: userForStats.total_workout_minutes || 0,
          current_streak: userForStats.current_streak || 0
        };
        
        console.log('Setting user stats to:', newStats);
        setUserStats(newStats);
        
        // Load latest measurement for this user
        await loadLatestMeasurementForUser(userForStats);
      } else {
        console.log('No user found, showing create user modal');
        // No user exists, show create user modal
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
    }, [loadCurrentUser])
  );

  const handleManualRecalculation = async () => {
    if (!currentUser) return;
    
    try {
      setIsRecalculating(true);
      const userId = (currentUser.username || currentUser.id || 'default').toString();
      
      console.log('Manually recalculating stats for user:', userId);
      const recalcResult = await recalculateUserStatsFromTables(userId);
      
      if (recalcResult && recalcResult.success && recalcResult.stats) {
        // Use the calculated stats directly
        console.log('Manual recalc - using stats directly:', recalcResult.stats);
        const updatedUser = {
          ...currentUser,
          ...recalcResult.stats
        };
        setCurrentUser(updatedUser);
        
        // Update the display stats
        const exerciseStats = await getUserExerciseStats(userId);
        const newStats = {
          total_workouts: recalcResult.stats.total_workouts,
          total_exercises: exerciseStats.totalExercises || 0,
          total_sets: exerciseStats.totalSets || 0,
          tons_lifted: exerciseStats.tonsLifted || 0,
          total_workout_minutes: recalcResult.stats.total_workout_minutes,
          current_streak: recalcResult.stats.current_streak
        };
        setUserStats(newStats);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Stats Updated',
        text2: 'Your statistics have been recalculated',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error recalculating stats:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to recalculate statistics',
        visibilityTime: 2000,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a username',
        visibilityTime: 2000,
      });
      return;
    }

    try {
      setIsCreatingUser(true);
      await createUser(newUsername.trim());
      
      Toast.show({
        type: 'success',
        text1: 'User Created',
        text2: `Welcome, ${newUsername}!`,
        visibilityTime: 3000,
      });

      setNewUsername('');
      setShowUserModal(false);
      loadCurrentUser(); // Reload user data
    } catch (error) {
      console.error('Error creating user:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to create user',
        visibilityTime: 3000,
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const loadLatestMeasurementForUser = async (user: User) => {
    try {
      const userId = (user.username || user.id || 'default').toString();
      const measurement = await getLatestUserMeasurement(userId);
      setLatestMeasurement(measurement);
      
      // Set default picker values based on last measurement
      if (measurement) {
        setSelectedWeight(measurement.weight_lbs.toString());
        if (measurement.body_fat_percentage !== null && measurement.body_fat_percentage !== undefined) {
          setSelectedBodyFat(measurement.body_fat_percentage.toString());
          setIncludeBodyFat(true);
        } else {
          setIncludeBodyFat(false);
        }
      }
    } catch (error) {
      console.error('Error loading measurement:', error);
    }
  };

  const loadLatestMeasurement = useCallback(async () => {
    try {
      if (currentUser) {
        await loadLatestMeasurementForUser(currentUser);
      }
    } catch (error) {
      console.error('Error loading measurement:', error);
    }
  }, [currentUser]);

  const handleSaveMeasurement = async () => {
    if (!currentUser?.id) return;
    
    setSavingMeasurement(true);
    try {
      await recordUserMeasurement(
        (currentUser.username || currentUser.id || 'default').toString(),
        parseFloat(selectedWeight),
        includeBodyFat ? parseFloat(selectedBodyFat) : null
      );
      setShowMeasurementsModal(false);
      loadLatestMeasurement(); // Refresh the latest measurement
      Toast.show({
        type: 'success',
        text1: 'Success! 📊',
        text2: 'Measurement saved successfully!',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error saving measurement:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save measurement. Please try again.',
        visibilityTime: 2000,
      });
    }
    setSavingMeasurement(false);
  };

  // Generate weight options (100-400 lbs)
  const generateWeightOptions = () => {
    const options = [];
    for (let i = 100; i <= 400; i++) {
      options.push(i.toString());
    }
    return options;
  };

  // Generate body fat options (3-50%)
  const generateBodyFatOptions = () => {
    const options = [];
    for (let i = 3; i <= 50; i++) {
      options.push(i.toString());
    }
    return options;
  };

  const handleClearExercises = async () => {
    Alert.alert(
      'Clear Exercises Table',
      'This will permanently delete all exercises and favorites, and regenerate the default exercises. This action cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear & Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              
              // Show progress toast
              Toast.show({
                type: 'info',
                text1: 'Clearing Exercises...',
                text2: 'This may take a moment',
                visibilityTime: 2000,
              });
              
              console.log('Starting exercise regeneration process...');
              const success = await clearAndRegenerateExercises();
              console.log('Exercise regeneration completed:', success);
              
              if (success) {
                Toast.show({
                  type: 'success',
                  text1: 'Exercises Regenerated',
                  text2: 'All exercises have been cleared and regenerated from defaults',
                  visibilityTime: 3000,
                });
              } else {
                console.error('Exercise regeneration failed');
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to regenerate exercises table',
                  visibilityTime: 3000,
                });
              }
            } catch (error) {
              console.error('Error during exercise regeneration:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'An unexpected error occurred during regeneration',
                visibilityTime: 3000,
              });
            } finally {
              setIsClearing(false);
              console.log('Exercise regeneration process finished');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={100} color="#155724" />
        </View>
        <Text style={styles.name}>
          {currentUser ? currentUser.username : 'Loading...'}
        </Text>
        <Text style={styles.subtitle}>
          {currentUser ? 'Workout Tracker User' : 'Creating your profile...'}
        </Text>
        {currentUser && (
          <Text style={styles.joinDate}>
            Member since {new Date(currentUser.created_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.total_workouts}</Text>
            <Text style={styles.statLabel}>Workouts Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.total_exercises}</Text>
            <Text style={styles.statLabel}>Total Exercises</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.total_sets}</Text>
            <Text style={styles.statLabel}>Sets Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{(userStats.tons_lifted || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Tons Lifted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.total_workout_minutes}</Text>
            <Text style={styles.statLabel}>Total Minutes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.current_streak}</Text>
            <Text style={styles.statLabel}>Weekly Streak</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => {
            loadLatestMeasurement(); // Load fresh values
            setShowMeasurementsModal(true);
          }}
        >
          <Ionicons name="fitness-outline" size={24} color="#155724" />
          <Text style={styles.settingText}>Enter Measurements</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/manage-exercises')}
        >
          <Ionicons name="barbell-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Manage Exercises</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Tools</Text>
        <TouchableOpacity 
          style={[styles.actionButton, isRecalculating && styles.disabledButton]}
          onPress={handleManualRecalculation}
          disabled={isRecalculating}
        >
          {isRecalculating ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.actionButtonText}>
            {isRecalculating ? 'Recalculating...' : 'Refresh Stats'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.actionDescription}>
          Tap to recalculate your workout statistics from saved data
        </Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/debug')}
        >
          <Ionicons name="bug-outline" size={24} color="#155724" />
          <Text style={styles.settingText}>Debug: View User Exercises</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingItem, isClearing && styles.settingItemDisabled]} 
          onPress={handleClearExercises}
          disabled={isClearing}
        >
          <Ionicons name="refresh-outline" size={24} color={isClearing ? "#ccc" : "#e74c3c"} />
          <Text style={[styles.settingText, isClearing && styles.settingTextDisabled]}>
            {isClearing ? 'Clearing Exercises...' : 'Clear & Regenerate Exercises'}
          </Text>
          <Ionicons name="warning-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.comingSoon}>Profile features coming soon!</Text>
      </View>
      
      {/* User Creation Modal */}
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Welcome to Workout Tracker!</Text>
            <Text style={styles.modalSubtitle}>Let&apos;s create your profile</Text>
            
            <TextInput
              style={styles.usernameInput}
              placeholder="Enter your username"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoFocus={true}
            />
            
            <TouchableOpacity
              style={[styles.createButton, isCreatingUser && styles.createButtonDisabled]}
              onPress={handleCreateUser}
              disabled={isCreatingUser}
            >
              <Text style={styles.createButtonText}>
                {isCreatingUser ? 'Creating...' : 'Create Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Measurements Modal */}
      <Modal
        visible={showMeasurementsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMeasurementsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Measurements</Text>
            <Text style={styles.modalSubtitle}>Track your weight and body fat percentage</Text>

            {latestMeasurement && (
              <View style={styles.lastMeasurementContainer}>
                <Text style={styles.lastMeasurementTitle}>Last Measurement:</Text>
                <Text style={styles.lastMeasurementText}>
                  Weight: {latestMeasurement.weight_lbs} lbs
                  {latestMeasurement.body_fat_percentage !== null && latestMeasurement.body_fat_percentage !== undefined && 
                    ` | Body Fat: ${latestMeasurement.body_fat_percentage}%`}
                </Text>
                <Text style={styles.lastMeasurementDate}>
                  {new Date(latestMeasurement.recorded_at).toLocaleDateString()}
                </Text>
              </View>
            )}

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Weight (lbs):</Text>
              <Picker
                selectedValue={selectedWeight}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedWeight(itemValue)}
              >
                {generateWeightOptions().map((weight) => (
                  <Picker.Item key={weight} label={weight} value={weight} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setIncludeBodyFat(!includeBodyFat)}
            >
              <View style={[styles.checkbox, includeBodyFat && styles.checkboxChecked]}>
                {includeBodyFat && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Include Body Fat Percentage</Text>
            </TouchableOpacity>

            {includeBodyFat && (
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Body Fat (%):</Text>
                <Picker
                  selectedValue={selectedBodyFat}
                  style={styles.picker}
                  onValueChange={(itemValue) => setSelectedBodyFat(itemValue)}
                >
                  {generateBodyFatOptions().map((bodyFat) => (
                    <Picker.Item key={bodyFat} label={bodyFat} value={bodyFat} />
                  ))}
                </Picker>
              </View>
            )}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMeasurementsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, savingMeasurement && styles.disabledButton]}
                onPress={handleSaveMeasurement}
                disabled={savingMeasurement}
              >
                <Text style={styles.saveButtonText}>
                  {savingMeasurement ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      
      <CustomNavigation active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    width: '31%',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  settingItemDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    opacity: 0.5,
  },
  settingTextDisabled: {
    fontSize: 16,
    color: '#999',
    flex: 1,
    marginLeft: 12,
  },
  comingSoon: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
  joinDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40, // Extra padding for safe area
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 24,
    minWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  usernameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#155724',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 120,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lastMeasurementContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  lastMeasurementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  lastMeasurementText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  lastMeasurementDate: {
    fontSize: 12,
    color: '#666',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#155724',
    borderColor: '#155724',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 6,
    alignItems: 'center',
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#155724',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#155724',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    lineHeight: 20,
  },
});