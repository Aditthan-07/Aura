import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTasks, toggleTaskStatus, deleteTask } from '../services/storage';

export default function TodayScreen() {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Format today's date
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const loadTasks = async () => {
    const allTasks = await getTasks();
    // Default to show today's tasks or all active tasks
    setTasks(allTasks);
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleToggle = async (id) => {
    const updated = await toggleTaskStatus(id);
    setTasks(updated);
  };

  const handleDelete = async (id) => {
    const remaining = await deleteTask(id);
    setTasks(remaining);
  };

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const renderTaskItem = ({ item }) => {
    const isCompleted = item.status === 'completed';
    return (
      <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
        {/* Toggle Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleToggle(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isCompleted ? '#10B981' : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Task Details */}
        <View style={styles.taskTextContainer}>
          <Text
            style={[
              styles.taskTitle,
              isCompleted && styles.taskTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.time ? (
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>⏰ {item.time}</Text>
            </View>
          ) : null}
        </View>

        {/* Delete Action Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={19} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyEmoji}>🌿</Text>
      </View>
      <Text style={styles.emptyTitle}>No tasks scheduled for today.</Text>
      <Text style={styles.emptySubtitle}>Tap ＋ to add one.</Text>
      <TouchableOpacity
        style={styles.emptyAddButton}
        onPress={() => navigation.navigate('AddTask')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.emptyAddButtonText}>Schedule First Task</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{todayDateStr}</Text>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>🌿 Aura</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Today's Focus</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Card (shows if tasks exist) */}
        {totalCount > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Daily Progress</Text>
              <Text style={styles.progressFraction}>
                {completedCount} of {totalCount} completed ({progressPercent}%)
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* Task List or Empty State */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            tasks.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#10B981']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statusPill: {
    backgroundColor: '#E6F4EA',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressFraction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.82,
  },
  checkboxContainer: {
    marginRight: 14,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  timeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  deleteButton: {
    padding: 6,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 38,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
