import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomNavigation from '../components/CustomNavigation';
import { deleteUserMeasurement, deleteWorkoutBySessionGuid, deleteWorkoutCompletion, getCurrentUser, getUserMeasurementHistory, getUserWorkoutHistory, getWorkoutsFromDB, moveWorkoutToDate, recordCompletedWorkout, recordUserMeasurement } from '../utils/database';

interface WorkoutRecord {
  id: number;
  workout_id: number;
  workout_name: string;
  duration: number;
  completed_at: string;
  comments?: string;
  session_guid?: string | null;
}

interface MeasurementRecord {
  id: number;
  user_id: string;
  weight_lbs: number;
  body_fat_percentage: number;
  recorded_at: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workoutDates, setWorkoutDates] = useState<{[date: string]: any}>({});
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<WorkoutRecord[]>([]);
  const [selectedDateMeasurements, setSelectedDateMeasurements] = useState<MeasurementRecord[]>([]);
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [availableWorkouts, setAvailableWorkouts] = useState<any[]>([]);
  const [selectedWorkoutToAdd, setSelectedWorkoutToAdd] = useState<any>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualComments, setManualComments] = useState('');
  const [adding, setAdding] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<WorkoutRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState('150');
  const [selectedBodyFat, setSelectedBodyFat] = useState('15');
  const [includeBodyFat, setIncludeBodyFat] = useState(true);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [workoutToMove, setWorkoutToMove] = useState<WorkoutRecord | null>(null);
  const [moveToDate, setMoveToDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showDeleteMeasurementModal, setShowDeleteMeasurementModal] = useState(false);
  const [measurementToDelete, setMeasurementToDelete] = useState<MeasurementRecord | null>(null);
  const [deletingMeasurement, setDeletingMeasurement] = useState(false);

  const generateSessionGuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

  const loadWorkoutHistory = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      
      if (user) {
        const userId = (user?.username || user?.id || 'default').toString();
        //console.log('Calendar: Loading data for user:', { username: user?.username, id: user?.id, finalUserId: userId });
        const history = await getUserWorkoutHistory(userId, 365); // Get last year's workouts
        const measurements = await getUserMeasurementHistory(userId, 365); // Get last year's measurements
        //console.log('Calendar: Loaded workout history:', history);
        //console.log('Calendar: Loaded measurements:', measurements);
        setWorkoutHistory(history);
        
        // Load available workouts for manual addition
        const workouts = await getWorkoutsFromDB();
        setAvailableWorkouts(workouts);
        
        // Create marked dates object for calendar
        const markedDates: {[date: string]: any} = {};
        
        // Add workouts to marked dates
        history.forEach((workout: WorkoutRecord) => {
          // Handle different date formats - extract just YYYY-MM-DD
          const completedAt = workout.completed_at;
          let date;
          if (completedAt.includes('T')) {
            date = completedAt.split('T')[0]; // Extract YYYY-MM-DD from ISO format
          } else {
            date = completedAt.split(' ')[0]; // Extract YYYY-MM-DD from space-separated format
          }
          
          //console.log('Calendar: Processing workout date:', { original: completedAt, extracted: date });
          
          if (!markedDates[date]) {
            markedDates[date] = {
              dots: [{
                key: 'workout',
                color: '#155724',
                selectedDotColor: '#155724'
              }],
              workoutCount: 1,
              workouts: [workout],
              measurements: []
            };
          } else {
            markedDates[date].workoutCount += 1;
            markedDates[date].workouts.push(workout);
          }
        });

        // Add measurements to marked dates
        measurements.forEach((measurement: MeasurementRecord) => {
          // Handle different date formats - extract just YYYY-MM-DD
          const recordedAt = measurement.recorded_at;
          let date;
          if (recordedAt.includes('T')) {
            date = recordedAt.split('T')[0]; // Extract YYYY-MM-DD from ISO format
          } else {
            date = recordedAt.split(' ')[0]; // Extract YYYY-MM-DD from space-separated format
          }
          
          if (!markedDates[date]) {
            markedDates[date] = {
              dots: [{
                key: 'measurement',
                color: '#ffd700',
                selectedDotColor: '#ffd700'
              }],
              workoutCount: 0,
              workouts: [],
              measurements: [measurement]
            };
          } else {
            markedDates[date].measurements = markedDates[date].measurements || [];
            markedDates[date].measurements.push(measurement);
            // Add yellow dot for measurements
            markedDates[date].dots = markedDates[date].dots || [];
            if (!markedDates[date].dots.find((dot: any) => dot.key === 'measurement')) {
              markedDates[date].dots.push({
                key: 'measurement',
                color: '#ffd700',
                selectedDotColor: '#ffd700'
              });
            }
          }
        });
        
        //console.log('Calendar: Created marked dates:', Object.keys(markedDates).length, 'days');
        // console.log('Calendar: Sample marked dates:', Object.keys(markedDates).slice(0, 3).map(date => ({
        //   date,
        //   data: markedDates[date]
        // })));
        setWorkoutDates(markedDates);
        
        // If there's a selected date, update the selected date workouts and measurements
        if (selectedDate) {
          const dayWorkouts = markedDates[selectedDate]?.workouts || [];
          const dayMeasurements = markedDates[selectedDate]?.measurements || [];
          setSelectedDateWorkouts(dayWorkouts);
          setSelectedDateMeasurements(dayMeasurements);
        }
      }
    } catch (error) {
      console.error('Error loading workout history:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadWorkoutHistory();
  }, [loadWorkoutHistory]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkoutHistory();
    }, [loadWorkoutHistory])
  );

  const onDayPress = (day: DateData) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    
    const dayWorkouts = workoutDates[dateString]?.workouts || [];
    const dayMeasurements = workoutDates[dateString]?.measurements || [];
    setSelectedDateWorkouts(dayWorkouts);
    setSelectedDateMeasurements(dayMeasurements);
  };

  const formatDuration = (duration: number) => {
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getWorkoutStatsText = () => {
    const totalWorkouts = workoutHistory.length;
    const uniqueDates = Object.keys(workoutDates).length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthWorkouts = workoutHistory.filter(workout => {
      const workoutDate = new Date(workout.completed_at);
      return workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear;
    }).length;

    return {
      totalWorkouts,
      uniqueDates,
      thisMonthWorkouts
    };
  };

  const handleAddWorkoutToDate = () => {
    if (!selectedDate || availableWorkouts.length === 0) return;
    setShowAddWorkoutModal(true);
  };

  const handleSelectWorkoutToAdd = (workout: any) => {
    setSelectedWorkoutToAdd(workout);
    setShowAddWorkoutModal(false);
    setShowCompletionModal(true);
  };

  const handleManualWorkoutSubmit = async () => {
    if (!selectedWorkoutToAdd || !selectedDate || !manualDuration.trim()) return;
    
    try {
      setAdding(true);
      const user = await getCurrentUser();
      const userId = (user?.username || user?.id || 'default').toString();
      
      // Create date string for the selected date (use noon in local timezone to avoid timezone issues)
      // Parse the selectedDate (YYYY-MM-DD) and create a Date in local timezone at noon
      const [year, month, day] = selectedDate.split('-').map(Number);
      const selectedDateObj = new Date(year, month - 1, day, 12, 0, 0, 0);
      const customDate = selectedDateObj.toISOString();
      
      // Record the workout with custom date
      const sessionGuid = generateSessionGuid();

      const result = await recordCompletedWorkout(
        userId,
        selectedWorkoutToAdd.id,
        selectedWorkoutToAdd.name,
        parseInt(manualDuration) || 30,
        manualComments.trim(),
        customDate,
        sessionGuid
      );
      
      if (result.success) {
        // Reset form
        setManualDuration('');
        setManualComments('');
        setSelectedWorkoutToAdd(null);
        setShowCompletionModal(false);
        
        // Reload data to show the new workout
        await loadWorkoutHistory();
        
        // Show success message
        console.log(`Added ${selectedWorkoutToAdd.name} workout for ${selectedDate}`);
      }
    } catch (error) {
      console.error('Error adding manual workout:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleSaveMeasurement = async () => {
    if (!selectedDate || !selectedWeight.trim()) return;
    
    try {
      setSavingMeasurement(true);
      const user = await getCurrentUser();
      const userId = (user?.username || user?.id || 'default').toString();
      
      console.log('Calendar: Saving measurement for user:', { username: user?.username, id: user?.id, finalUserId: userId });
      console.log('Calendar: Saving measurement for date:', selectedDate);
      
      // Create date string in ISO format for the selected date
      // Save measurement with the selected date
      await recordUserMeasurement(
        userId,
        parseFloat(selectedWeight),
        includeBodyFat ? parseFloat(selectedBodyFat) : null,
        null
      );
      
      // Reset form
      setSelectedWeight('150');
      setSelectedBodyFat('15');
      setIncludeBodyFat(true);
      setShowMeasurementModal(false);
      
      // Reload data to show the new measurement
      await loadWorkoutHistory();
      
      console.log('Calendar: Measurement saved successfully');
    } catch (error) {
      console.error('Error saving measurement:', error);
    } finally {
      setSavingMeasurement(false);
    }
  };

  const cancelManualWorkout = () => {
    setManualDuration('');
    setManualComments('');
    setSelectedWorkoutToAdd(null);
    setShowCompletionModal(false);
    setShowAddWorkoutModal(false);
  };

  const handleDeleteWorkout = (workout: WorkoutRecord) => {
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  const handleMoveWorkout = (workout: WorkoutRecord) => {
    setWorkoutToMove(workout);
    setMoveToDate(new Date(workout.completed_at));
    setShowMoveModal(true);
  };

  const confirmMoveWorkout = async () => {
    if (!workoutToMove) return;
    
    try {
      setMoving(true);
      
      // Format the date to ISO string for database
      const newDateString = moveToDate.toISOString();
      
      await moveWorkoutToDate(workoutToMove.id, newDateString);
      
      // Refresh the calendar data
      await loadWorkoutHistory();
      
      setShowMoveModal(false);
      setWorkoutToMove(null);
      
      // Clear selected date if needed and refresh it to show changes immediately
      if (selectedDate) {
        // Reload the selected date to show updated data
        onDayPress({ dateString: selectedDate } as DateData);
      }
    } catch (error) {
      console.error('Error moving workout:', error);
      alert('Failed to move workout. Please try again.');
    } finally {
      setMoving(false);
    }
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setMoveToDate(selectedDate);
    }
  };

  const confirmDeleteWorkout = async () => {
    if (!workoutToDelete) return;
    
    try {
      setDeleting(true);
      const user = await getCurrentUser();
      const userId = (user?.username || user?.id || 'default').toString();
      
      // Use GUID-based deletion if session_guid is available, otherwise fall back to old method
      let result;
      if (workoutToDelete.session_guid) {
        console.log(`Deleting workout by session GUID: ${workoutToDelete.session_guid}`);
        result = await deleteWorkoutBySessionGuid(userId, workoutToDelete.session_guid);
      } else {
        console.log(`Deleting workout by ID (fallback): ${workoutToDelete.id}`);
        result = await deleteWorkoutCompletion(userId, workoutToDelete.id);
      }
      
      if (result.success) {
        // Reload data to reflect the deletion
        await loadWorkoutHistory();
        
        // Reset delete state
        setWorkoutToDelete(null);
        setShowDeleteModal(false);
        
        console.log(`Deleted workout: ${workoutToDelete.workout_name}`);
        console.log(`Deleted workout records for session: ${workoutToDelete.session_guid || 'unknown'}`);
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteWorkout = () => {
    setWorkoutToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteMeasurement = (measurement: MeasurementRecord) => {
    setMeasurementToDelete(measurement);
    setShowDeleteMeasurementModal(true);
  };

  const confirmDeleteMeasurement = async () => {
    if (!measurementToDelete) return;
    
    try {
      setDeletingMeasurement(true);
      const user = await getCurrentUser();
      const userId = (user?.username || user?.id || 'default').toString();
      
      const result = await deleteUserMeasurement(userId, measurementToDelete.id);
      
      if (typeof result === 'object' && result && 'success' in result && result.success) {
        // Reload data to reflect the deletion
        await loadWorkoutHistory();
        
        // Reset delete state
        setMeasurementToDelete(null);
        setShowDeleteMeasurementModal(false);
        
        console.log(`Deleted measurement: ${measurementToDelete.weight_lbs}lbs`);
      }
    } catch (error) {
      console.error('Error deleting measurement:', error);
    } finally {
      setDeletingMeasurement(false);
    }
  };

  const cancelDeleteMeasurement = () => {
    setMeasurementToDelete(null);
    setShowDeleteMeasurementModal(false);
  };

  const stats = getWorkoutStatsText();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#155724" />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </View>
        <CustomNavigation active="calendar" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="calendar" size={32} color="#155724" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Workout Calendar</Text>
              <Text style={styles.headerSubtitle}>Track your consistency</Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.uniqueDates}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.thisMonthWorkouts}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markingType="multi-dot"
            markedDates={{
              ...workoutDates,
              ...(selectedDate ? {
                [selectedDate]: {
                  ...workoutDates[selectedDate],
                  selected: true,
                  selectedColor: '#155724',
                  dots: workoutDates[selectedDate]?.dots || []
                }
              } : {})
            }}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#155724',
              selectedDayBackgroundColor: '#155724',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#155724',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              arrowColor: '#155724',
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#155724',
              indicatorColor: '#155724',
              textDayFontWeight: '500',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
            style={styles.calendar}
          />
        </View>

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateTitle}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            {selectedDateWorkouts.length > 0 && (
              <View style={styles.workoutsList}>
                {selectedDateWorkouts.map((workout, index) => (
                  <TouchableOpacity 
                    key={workout.id} 
                    style={styles.workoutItem}
                    onPress={() => router.push(`/workout-summary/${workout.id}?date=${selectedDate}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workoutHeader}>
                      <View style={styles.workoutInfo}>
                        <Ionicons name="fitness-outline" size={16} color="#155724" />
                        <Text style={styles.workoutName}>{workout.workout_name}</Text>
                        <Text style={styles.workoutDuration}>
                          {formatDuration(workout.duration)}
                        </Text>
                        <Ionicons name="chevron-forward-outline" size={16} color="#666" style={styles.workoutChevron} />
                      </View>
                      <View style={styles.workoutActions}>
                        <TouchableOpacity
                          style={styles.moveWorkoutButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleMoveWorkout(workout);
                          }}
                        >
                          <Ionicons name="calendar-outline" size={16} color="#007bff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteWorkoutButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkout(workout);
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#dc3545" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {workout.comments && (
                      <Text style={styles.workoutComments}>{workout.comments}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {selectedDateMeasurements.length > 0 && (
              <View style={styles.measurementsList}>
                <Text style={styles.sectionSubtitle}>Measurements</Text>
                {selectedDateMeasurements.map((measurement, index) => (
                  <View key={measurement.id} style={styles.measurementItem}>
                    <View style={styles.measurementIcon}>
                      <Ionicons name="scale-outline" size={20} color="#007bff" />
                    </View>
                    <View style={styles.measurementContent}>
                      <Text style={styles.measurementText}>
                        Weight: {measurement.weight_lbs} lbs
                      </Text>
                      {measurement.body_fat_percentage !== null && measurement.body_fat_percentage !== undefined && (
                        <Text style={styles.measurementText}>
                          Body Fat: {measurement.body_fat_percentage}%
                        </Text>
                      )}
                      <Text style={styles.measurementDate}>
                        {new Date(measurement.recorded_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteMeasurementButton}
                      onPress={() => handleDeleteMeasurement(measurement)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {selectedDateWorkouts.length === 0 && selectedDateMeasurements.length === 0 && (
              <Text style={styles.emptyDateText}>No workouts or measurements recorded</Text>
            )}
            
            {/* Add Workout Button */}
            <TouchableOpacity 
              style={styles.addWorkoutButton}
              onPress={handleAddWorkoutToDate}
            >
              <Ionicons name="add-circle-outline" size={20} color="#155724" />
              <Text style={styles.addWorkoutButtonText}>Manually Add Workout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.addMeasurementButton}
              onPress={() => setShowMeasurementModal(true)}
            >
              <Ionicons name="scale-outline" size={20} color="#007bff" />
              <Text style={styles.addMeasurementButtonText}>Add Measurement</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      <CustomNavigation active="calendar" />
    </SafeAreaView>

    {/* Move Workout Modal */}
    <Modal
      visible={showMoveModal}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setShowMoveModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Move Workout</Text>
          <TouchableOpacity onPress={() => setShowMoveModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.moveContent}>
          <Text style={styles.moveLabel}>Move &ldquo;{workoutToMove?.workout_name}&rdquo; to:</Text>
          
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#155724" />
            <Text style={styles.datePickerButtonText}>
              {moveToDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.moveModalActions}>
            <TouchableOpacity 
              style={styles.cancelMoveButton}
              onPress={() => setShowMoveModal(false)}
              disabled={moving}
            >
              <Text style={styles.cancelMoveButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmMoveButton, moving && styles.confirmMoveButtonDisabled]}
              onPress={confirmMoveWorkout}
              disabled={moving}
            >
              {moving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmMoveButtonText}>Move Workout</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {showDatePicker && (
        <DateTimePicker
          value={moveToDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDatePickerChange}
        />
      )}
    </Modal>

    {/* Workout Selection Modal */}
    <Modal
      visible={showAddWorkoutModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddWorkoutModal(false)}
    >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Workout</Text>
            <TouchableOpacity onPress={() => setShowAddWorkoutModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.workoutSelectionList}>
            {availableWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.workoutSelectionItem}
                onPress={() => handleSelectWorkoutToAdd(workout)}
              >
                <View style={styles.workoutSelectionInfo}>
                  <Text style={styles.workoutSelectionName}>{workout.name}</Text>
                  <Text style={styles.workoutSelectionDetails}>
                    {workout.num_exercises} exercises • ~{workout.duration} min
                  </Text>
                  <Text style={styles.workoutSelectionGroup}>{workout.major_group}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Workout Completion Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelManualWorkout}
      >
        <View style={styles.completionModalOverlay}>
          <View style={[styles.completionModal, { paddingTop: 20 }]}> 
            <View style={styles.completionModalHeader}>
              <Text style={styles.completionModalTitle}>Complete Workout</Text>
            </View>
            
            <Text style={styles.completionWorkoutName}>
              {selectedWorkoutToAdd?.name}
            </Text>
            <Text style={styles.completionDateText}>
              for {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
            
            <View style={styles.completionInputSection}>
              <Text style={styles.completionInputLabel}>Duration (minutes) *</Text>
              <TextInput
                style={styles.completionDurationInput}
                value={manualDuration}
                onChangeText={setManualDuration}
                placeholder="e.g., 45"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            
            <View style={styles.completionInputSection}>
              <Text style={styles.completionInputLabel}>Comments (optional)</Text>
              <TextInput
                style={styles.completionCommentsInput}
                value={manualComments}
                onChangeText={setManualComments}
                placeholder="How did you feel? Any notes about the workout..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.completionModalButtons}>
              <TouchableOpacity
                style={styles.completionCancelButton}
                onPress={cancelManualWorkout}
                disabled={adding}
              >
                <Text style={styles.completionCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.completionSaveButton, !manualDuration.trim() && styles.completionSaveButtonDisabled]}
                onPress={handleManualWorkoutSubmit}
                disabled={adding || !manualDuration.trim()}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.completionSaveButtonText}>Add Workout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelDeleteWorkout}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete Workout</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete &ldquo;{workoutToDelete?.workout_name}&rdquo; from{' '}
              {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString()}?
            </Text>
            <Text style={styles.deleteModalWarning}>This action cannot be undone.</Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={cancelDeleteWorkout}
              >
                <Text style={styles.deleteModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteWorkout}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalConfirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Delete Measurement Confirmation Modal */}
      <Modal
        visible={showDeleteMeasurementModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelDeleteMeasurement}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete Measurement</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete the measurement ({measurementToDelete?.weight_lbs} lbs) from{' '}
              {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString()}?
            </Text>
            <Text style={styles.deleteModalWarning}>This action cannot be undone.</Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={cancelDeleteMeasurement}
              >
                <Text style={styles.deleteModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteMeasurement}
                disabled={deletingMeasurement}
              >
                {deletingMeasurement ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalConfirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Measurement Modal */}
      <Modal
        visible={showMeasurementModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMeasurementModal(false)}
      >
        <View style={styles.completionModalOverlay}>
          <View style={[styles.completionModal, { paddingTop: 20 }]}> 
            <View style={styles.completionModalHeader}>
              <Text style={styles.completionModalTitle}>Add Measurement</Text>
            </View>
            
            <Text style={styles.completionDateText}>
              for {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
            
            <View style={styles.completionInputSection}>
              <Text style={styles.completionInputLabel}>Weight (lbs) *</Text>
              <TextInput
                style={styles.completionDurationInput}
                value={selectedWeight}
                onChangeText={setSelectedWeight}
                placeholder="e.g., 175"
                keyboardType="numeric"
                maxLength={3}
              />
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
              <View style={styles.completionInputSection}>
                <Text style={styles.completionInputLabel}>Body Fat (%)</Text>
                <TextInput
                  style={styles.completionDurationInput}
                  value={selectedBodyFat}
                  onChangeText={setSelectedBodyFat}
                  placeholder="e.g., 15"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            )}
            
            <View style={styles.completionModalButtons}>
              <TouchableOpacity
                style={styles.completionCancelButton}
                onPress={() => setShowMeasurementModal(false)}
                disabled={savingMeasurement}
              >
                <Text style={styles.completionCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.completionSaveButton, !selectedWeight.trim() && styles.completionSaveButtonDisabled]}
                onPress={handleSaveMeasurement}
                disabled={savingMeasurement || !selectedWeight.trim()}
              >
                {savingMeasurement ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.completionSaveButtonText}>Save Measurement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calendar: {
    borderRadius: 12,
  },
  selectedDateContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 12,
  },
  workoutsList: {
    gap: 8,
  },
  workoutItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#155724',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  workoutDuration: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  workoutComments: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  // Measurements styles
  measurementsList: {
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  measurementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  measurementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  measurementContent: {
    flex: 1,
  },
  measurementText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  measurementDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteMeasurementButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  emptyDateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Add Workout Button Styles
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#155724',
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addWorkoutButtonText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
  },
  addMeasurementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007bff',
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  addMeasurementButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
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
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f2f7f2',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
  },
  workoutSelectionList: {
    flex: 1,
    padding: 16,
  },
  workoutSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  workoutSelectionInfo: {
    flex: 1,
  },
  workoutSelectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  workoutSelectionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  workoutSelectionGroup: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  // Completion Modal Styles
  completionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completionModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  completionModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  completionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
  },
  completionWorkoutName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionDateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  completionInputSection: {
    marginBottom: 20,
  },
  completionInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  completionDurationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  completionCommentsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
  },
  completionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  completionCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  completionCancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  completionSaveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#155724',
  },
  completionSaveButtonDisabled: {
    opacity: 0.6,
  },
  completionSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Workout item styles
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutChevron: {
    marginLeft: 'auto',
    marginRight: 8,
  },
  deleteWorkoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  // Delete modal styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
    maxWidth: 340,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  deleteModalCancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#dc3545',
  },
  deleteModalConfirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Move workout styles
  workoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveWorkoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
    marginRight: 8,
  },
  moveContent: {
    padding: 20,
  },
  moveLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 20,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#155724',
    marginLeft: 8,
    fontWeight: '500',
  },
  moveModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelMoveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  cancelMoveButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmMoveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#155724',
    alignItems: 'center',
  },
  confirmMoveButtonDisabled: {
    opacity: 0.6,
  },
  confirmMoveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});