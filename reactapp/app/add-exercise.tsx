import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { createCustomExercise, getCurrentUser } from '../utils/database';

export default function AddExerciseScreen() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    major_group: 'chest',
    minor_group: '',
    base_sets: '3',
    base_reps: '10',
    estimated_duration: '10',
    press_pull: '',
    category: 'strength',
    bodyweight: false,
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const majorGroups = [
    'chest', 'arms', 'back', 'legs', 'shoulders', 'core', 'cardio'
  ];

  const pressPullOptions = [
    { label: 'Select...', value: '' },
    { label: 'Push', value: 'push' },
    { label: 'Pull', value: 'pull' },
    { label: 'Neither', value: 'neither' },
  ];

  const categoryOptions = [
    { label: 'Strength', value: 'strength' },
    { label: 'Cardio', value: 'cardio' },
    { label: 'Flexibility', value: 'flexibility' },
    { label: 'Balance', value: 'balance' },
  ];

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Exercise name is required';
    }

    if (!formData.major_group) {
      newErrors.major_group = 'Major muscle group is required';
    }

    const sets = parseInt(formData.base_sets);
    if (isNaN(sets) || sets < 1 || sets > 10) {
      newErrors.base_sets = 'Sets must be between 1 and 10';
    }

    const reps = parseInt(formData.base_reps);
    if (isNaN(reps) || reps < 1 || reps > 100) {
      newErrors.base_reps = 'Reps must be between 1 and 100';
    }

    const duration = parseInt(formData.estimated_duration);
    if (isNaN(duration) || duration < 1 || duration > 120) {
      newErrors.estimated_duration = 'Duration must be between 1 and 120 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fix the errors below',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      setSaving(true);
      
      const user = await getCurrentUser();
      const userId = user?.username || 'default';

      const exerciseData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        major_group: formData.major_group,
        minor_group: formData.minor_group.trim() || null,
        base_sets: parseInt(formData.base_sets),
        base_reps: parseInt(formData.base_reps),
        estimated_duration: parseInt(formData.estimated_duration),
        press_pull: formData.press_pull || null,
        category: formData.category,
        bodyweight: formData.bodyweight,
      };

      await createCustomExercise(userId, exerciseData);

      Toast.show({
        type: 'success',
        text1: 'Exercise Created',
        text2: `${formData.name} has been added to your exercises`,
        visibilityTime: 3000,
      });

      router.back();
    } catch (error) {
      console.error('Error creating exercise:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: 'Unable to create exercise. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#155724" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Exercise</Text>
        <TouchableOpacity
          onPress={handleSave}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Exercise Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              placeholder="e.g., Incline Dumbbell Press"
              maxLength={100}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textArea]}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="Describe how to perform this exercise..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </View>

        {/* Muscle Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muscle Groups</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Primary Muscle Group *</Text>
            <View style={[styles.pickerContainer, errors.major_group && styles.inputError]}>
              <Picker
                selectedValue={formData.major_group}
                onValueChange={(value) => updateFormData('major_group', value)}
                style={styles.picker}
              >
                {majorGroups.map(group => (
                  <Picker.Item 
                    key={group} 
                    label={group.charAt(0).toUpperCase() + group.slice(1)} 
                    value={group} 
                  />
                ))}
              </Picker>
            </View>
            {errors.major_group && <Text style={styles.errorText}>{errors.major_group}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Secondary Muscle Group</Text>
            <TextInput
              style={styles.input}
              value={formData.minor_group}
              onChangeText={(text) => updateFormData('minor_group', text)}
              placeholder="e.g., triceps, deltoids"
              maxLength={40}
            />
          </View>
        </View>

        {/* Exercise Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Settings</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Default Sets *</Text>
              <TextInput
                style={[styles.input, errors.base_sets && styles.inputError]}
                value={formData.base_sets}
                onChangeText={(text) => updateFormData('base_sets', text)}
                keyboardType="numeric"
                maxLength={2}
              />
              {errors.base_sets && <Text style={styles.errorText}>{errors.base_sets}</Text>}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Default Reps *</Text>
              <TextInput
                style={[styles.input, errors.base_reps && styles.inputError]}
                value={formData.base_reps}
                onChangeText={(text) => updateFormData('base_reps', text)}
                keyboardType="numeric"
                maxLength={3}
              />
              {errors.base_reps && <Text style={styles.errorText}>{errors.base_reps}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Estimated Duration (minutes) *</Text>
            <TextInput
              style={[styles.input, errors.estimated_duration && styles.inputError]}
              value={formData.estimated_duration}
              onChangeText={(text) => updateFormData('estimated_duration', text)}
              keyboardType="numeric"
              maxLength={3}
            />
            {errors.estimated_duration && <Text style={styles.errorText}>{errors.estimated_duration}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Movement Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.press_pull}
                onValueChange={(value) => updateFormData('press_pull', value)}
                style={styles.picker}
              >
                {pressPullOptions.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => updateFormData('category', value)}
                style={styles.picker}
              >
                {categoryOptions.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchInfo}>
              <Text style={styles.inputLabel}>Bodyweight Exercise</Text>
              <Text style={styles.switchDescription}>
                No external weight required
              </Text>
            </View>
            <Switch
              value={formData.bodyweight}
              onValueChange={(value) => updateFormData('bodyweight', value)}
              trackColor={{ false: '#ccc', true: '#155724' }}
              thumbColor={formData.bodyweight ? '#fff' : '#fff'}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7f2',
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
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
});