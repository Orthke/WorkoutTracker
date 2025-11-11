import { default as Checkbox } from 'expo-checkbox';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCompletedWorkouts, toggleWorkoutCompleted } from '../utils/storage';

export default function CollapsibleSection({ title, children, defaultOpen = false, workoutId }) {
  const [open, setOpen] = useState(defaultOpen);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedDate, setCompletedDate] = useState(null);

  const loadCompletionStatus = useCallback(async () => {
    const completedWorkouts = await getCompletedWorkouts();
    if (completedWorkouts[workoutId]) {
      setIsCompleted(true);
      setCompletedDate(new Date(completedWorkouts[workoutId]).toLocaleString());
    } else {
      setIsCompleted(false);
      setCompletedDate(null);
    }
  }, [workoutId]);

  useEffect(() => {
    loadCompletionStatus();
  }, [loadCompletionStatus]);

  const handleCheckboxChange = async () => {
    await toggleWorkoutCompleted(workoutId);
    await loadCompletionStatus();
  };

  return (
    <View style={styles.accordionItem}>
      <View style={styles.headerContainer}>
        <Checkbox
          value={isCompleted}
          onValueChange={handleCheckboxChange}
          style={styles.checkbox}
        />
        <TouchableOpacity 
          style={styles.titleContainer} 
          onPress={() => setOpen((v) => !v)}
        >
          <Text style={[styles.accordionHeader, open && styles.accordionHeaderOpen, isCompleted && styles.completedHeader]}>
            {title} {open ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      </View>
      {completedDate && (
        <Text style={styles.completedDate}>Completed: {completedDate}</Text>
      )}
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  accordionItem: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 18, padding: 10, elevation: 2 },
  headerContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { marginRight: 12 },
  titleContainer: { flex: 1 },
  accordionHeader: { fontSize: 18, fontWeight: '600', backgroundColor: '#536d82', color: '#fff', padding: 10, borderRadius: 6, marginBottom: 8 },
  accordionHeaderOpen: { backgroundColor: '#218838' },
  completedHeader: { backgroundColor: '#28a745' },
  completedDate: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4, marginLeft: 36 },
  accordionBody: { paddingLeft: 8, paddingBottom: 8 },
});
