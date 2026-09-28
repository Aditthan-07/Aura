import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addTask } from '../services/storage';
import { scheduleTaskReminder } from '../services/notifications';

export default function AddTaskScreen() {
  const navigation = useNavigation();

  // Helper date calculations
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getTomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [selectedTime, setSelectedTime] = useState('06:00 PM');
  const [customTime, setCustomTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickTimes = ['09:00 AM', '02:00 PM', '06:00 PM', '08:00 PM'];

  const handleSchedule = async () => {
    if (!title.trim()) {
      Alert.alert('Task Title Required', 'Please enter a name for your task.');
      return;
    }

    setIsSubmitting(true);
    const finalTime = customTime.trim() ? customTime.trim() : selectedTime;

    try {
      // 1. Calculate and queue OS-level local notification 30 minutes prior
      const notificationId = await scheduleTaskReminder({
        title: title.trim(),
        date: selectedDate,
        time: finalTime,
      });

      // 2. Persist task to local storage
      await addTask({
        title: title.trim(),
        date: selectedDate,
        time: finalTime,
        notificationId,
      });

      // 3. Reset and navigate back to Agenda
      setTitle('');
      setCustomTime('');
      setIsSubmitting(false);
      navigation.navigate('Today');
    } catch (e) {
      console.error('Error scheduling task:', e);
      setIsSubmitting(false);
      Alert.alert('Error', 'Unable to schedule task. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Schedule Task</Text>
            <Text style={styles.subtitle}>
              Set up your day with automatic 30-minute advance reminders.
            </Text>
          </View>

          {/* Task Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TASK TITLE</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="checkbox-outline" size={20} color="#10B981" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Read research paper, Team meeting"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
                autoFocus={true}
              />
            </View>
          </View>

          {/* Date Picker Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATE</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedDate === getTodayISO() && styles.chipActive,
                ]}
                onPress={() => setSelectedDate(getTodayISO())}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={selectedDate === getTodayISO() ? '#FFFFFF' : '#475569'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedDate === getTodayISO() && styles.chipTextActive,
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedDate === getTomorrowISO() && styles.chipActive,
                ]}
                onPress={() => setSelectedDate(getTomorrowISO())}
              >
                <Ionicons
                  name="sunny-outline"
                  size={16}
                  color={selectedDate === getTomorrowISO() ? '#FFFFFF' : '#475569'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedDate === getTomorrowISO() && styles.chipTextActive,
                  ]}
                >
                  Tomorrow
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SCHEDULED TIME</Text>
            <View style={styles.timeChipsWrap}>
              {quickTimes.map((timeOption) => {
                const isSelected = selectedTime === timeOption && !customTime;
                return (
                  <TouchableOpacity
                    key={timeOption}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                    onPress={() => {
                      setSelectedTime(timeOption);
                      setCustomTime('');
                    }}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        isSelected && styles.timeChipTextActive,
                      ]}
                    >
                      {timeOption}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Time Field */}
            <View style={[styles.inputWrapper, { marginTop: 10 }]}>
              <Ionicons name="time-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Or custom time (e.g. 02:30 PM, 14:00)"
                placeholderTextColor="#94A3B8"
                value={customTime}
                onChangeText={setCustomTime}
              />
            </View>
          </View>

          {/* Proactive 30-min Reminder Callout */}
          <View style={styles.calloutCard}>
            <Ionicons name="notifications-outline" size={22} color="#10B981" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.calloutTitle}>Local Alarm Scheduled</Text>
              <Text style={styles.calloutBody}>
                Aura will sound a native reminder alert 30 minutes before your scheduled deadline.
              </Text>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSchedule}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="alarm-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  chipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  timeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  timeChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  timeChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#CEEAD6',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  calloutBody: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 54,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
