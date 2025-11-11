import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import CustomNavigation from '../components/CustomNavigation';
import {
  clearAndRegenerateExercises,
  createUser,
  getCurrentUser,
  getUserExerciseStats
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
  longest_streak: number;
  current_streak: number;
  settings: object;
  is_active: number;
}

export default function ProfileScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [userStats, setUserStats] = useState({
    total_workouts: 0,
    total_exercises: 0,
    total_sets: 0,
    tons_lifted: 0,
    longest_streak: 0,
    current_streak: 0
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        
        // Get comprehensive exercise statistics
        const exerciseStats = await getUserExerciseStats(user.username || 'default');
        
        setUserStats({
          total_workouts: user.total_workouts,
          total_exercises: exerciseStats.totalExercises,
          total_sets: exerciseStats.totalSets,
          tons_lifted: exerciseStats.tonsLifted,
          longest_streak: user.longest_streak,
          current_streak: user.current_streak
        });
      } else {
        // No user exists, show create user modal
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
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
        text2: error.message || 'Failed to create user',
        visibilityTime: 3000,
      });
    } finally {
      setIsCreatingUser(false);
    }
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
    <View style={{ flex: 1 }}>
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
            <Text style={styles.statNumber}>{userStats.tons_lifted.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Tons Lifted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.longest_streak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.current_streak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="settings-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Tools</Text>
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
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#155724',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
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
});