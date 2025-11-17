import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getActiveWorkout, getCurrentUser, getWorkoutWithExercises } from '../utils/database';

const INSPIRATIONAL_QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Your body can do it. It's your mind you have to convince.",
  "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.",
  "Don't wish for it, work for it.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Champions keep playing until they get it right.",
  "Success isn't given. It's earned on the track, on the field, in every rep.",
  "Push yourself because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "It's not about perfect. It's about effort.",
  "Your only limit is your mind.",
  "Sweat is fat crying.",
  "Make yourself proud.",
  "The hard days are what make you stronger.",
  "Progress, not perfection.",
  "Be stronger than your excuses.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Every workout is progress, no matter how small."
];

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState<string>('');
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [currentQuote, setCurrentQuote] = useState<string>('');

  const loadUserAndWorkout = useCallback(async () => {
    try {
      // Set a random inspirational quote
      const randomIndex = Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length);
      setCurrentQuote(INSPIRATIONAL_QUOTES[randomIndex]);
      
      const user = await getCurrentUser();
      setUserName(user?.username || user?.name || 'there');
      
      if (user) {
        // Check for active workout
        const userId = user?.username || user?.id || 'default';
        const activeId = await getActiveWorkout(userId);
        setActiveWorkoutId(activeId);
        
        if (activeId) {
          // Load active workout details
          const workoutDetails = await getWorkoutWithExercises(activeId);
          setActiveWorkout(workoutDetails);
        } else {
          setActiveWorkout(null);
        }
      }
    } catch (error) {
      console.error('Error loading user and workout:', error);
      setUserName('there');
      // Set a fallback quote if there's an error
      setCurrentQuote('Ready to crush your fitness goals? Let\'s get started!');
    }
  }, []);

  useEffect(() => {
    loadUserAndWorkout();
  }, [loadUserAndWorkout]);
  
  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserAndWorkout();
    }, [loadUserAndWorkout])
  );

  const handleContinueWorkout = () => {
    if (activeWorkoutId) {
      router.push(`/workout-detail/${activeWorkoutId}` as any);
    }
  };

  return (
    <View style={[{ flex: 1, paddingTop: insets.top }]}>
      <View style={styles.container}>
        <View style={styles.welcomeSection}>
          <Ionicons name="fitness-outline" size={80} color="#155724" />
          <Text style={styles.welcomeTitle}>Welcome{userName ? `, ${userName}` : ''}!</Text>
          <Text style={styles.welcomeSubtitle}>
            {currentQuote || 'Ready to crush your fitness goals? Let\'s get started!'}
          </Text>
          
          <TouchableOpacity 
            style={styles.startWorkoutButton}
            onPress={() => router.push('/workout-list' as any)}
          >
            <Ionicons name="play-circle-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.startWorkoutText}>Start Workout</Text>
          </TouchableOpacity>
          
          {/* Continue Workout Button - Only show if there's an active workout */}
          {activeWorkout && (
            <TouchableOpacity 
              style={styles.continueWorkoutButton}
              onPress={handleContinueWorkout}
            >
              <Ionicons name="play" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.continueWorkoutText}>Continue Workout</Text>
              <Text style={styles.continueWorkoutSubtext}>{activeWorkout.name}</Text>
            </TouchableOpacity>
          )}
          
          {/* Quick Navigation Links */}
          <View style={styles.quickLinksSection}>
            <Text style={styles.quickLinksTitle}>Quick Access</Text>
            <View style={styles.quickLinksContainer}>
              <TouchableOpacity 
                style={styles.quickLinkButton}
                onPress={() => router.push('/calendar')}
              >
                <Ionicons name="calendar-outline" size={32} color="#155724" />
                <Text style={styles.quickLinkText}>Calendar</Text>
                <Text style={styles.quickLinkSubtext}>View workout history</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickLinkButton}
                onPress={() => router.push('/profile')}
              >
                <Ionicons name="person-outline" size={32} color="#155724" />
                <Text style={styles.quickLinkText}>Profile</Text>
                <Text style={styles.quickLinkSubtext}>Manage settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#155724',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  startWorkoutButton: {
    backgroundColor: '#155724',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonIcon: {
    marginRight: 12,
  },
  startWorkoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueWorkoutButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueWorkoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  continueWorkoutSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  quickLinksSection: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
  },
  quickLinksTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 20,
  },
  quickLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
  },
  quickLinkButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickLinkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginTop: 8,
  },
  quickLinkSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
