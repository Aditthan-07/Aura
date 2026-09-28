import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTasks, getStats, clearTasks } from '../services/storage';

export default function StatsScreen() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    completionRate: 0,
    streak: 0,
  });
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Pending' | 'Completed'

  const loadData = async () => {
    const allTasks = await getTasks();
    const computedStats = await getStats();
    setTasks(allTasks);
    setStats(computedStats);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleClearAll = () => {
    Alert.alert(
      'Reset All Tasks?',
      'This will remove all tasks and restore Aura to a completely clean slate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearTasks();
            await loadData();
          },
        },
      ]
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'Pending') return t.status === 'pending';
    if (activeFilter === 'Completed') return t.status === 'completed';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Habits & Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your daily discipline and completion trends.</Text>
        </View>

        {/* 2x2 Metric Cards Grid */}
        <View style={styles.grid}>
          {/* Card 1: Total Tasks */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="layers-outline" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.metricValue}>{stats.total}</Text>
            <Text style={styles.metricLabel}>Total Tasks</Text>
          </View>

          {/* Card 2: Completed */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-done-outline" size={22} color="#10B981" />
            </View>
            <Text style={styles.metricValue}>{stats.completed}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>

          {/* Card 3: Completion Rate */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="pie-chart-outline" size={22} color="#EC4899" />
            </View>
            <Text style={styles.metricValue}>{stats.completionRate}%</Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
          </View>

          {/* Card 4: Active Streak */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="flame-outline" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.metricValue}>{stats.streak}d</Text>
            <Text style={styles.metricLabel}>Active Days</Text>
          </View>
        </View>

        {/* Filter Segmented Control */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Task Breakdown</Text>
        </View>

        <View style={styles.filterBar}>
          {['All', 'Pending', 'Completed'].map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtered Task List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyFilterBox}>
            <Text style={styles.emptyFilterText}>No {activeFilter.toLowerCase()} tasks found.</Text>
          </View>
        ) : (
          filteredTasks.map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <Ionicons
                name={t.status === 'completed' ? 'checkmark-circle' : 'time-outline'}
                size={20}
                color={t.status === 'completed' ? '#10B981' : '#64748B'}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.rowTaskTitle,
                    t.status === 'completed' && styles.rowTaskTitleDone,
                  ]}
                  numberOfLines={1}
                >
                  {t.title}
                </Text>
                <Text style={styles.rowTaskDate}>
                  📅 {t.date} {t.time ? `• ⏰ ${t.time}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  t.status === 'completed' ? styles.statusTagDone : styles.statusTagPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    t.status === 'completed'
                      ? styles.statusTagTextDone
                      : styles.statusTagTextPending,
                  ]}
                >
                  {t.status}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Clear Data Reset Option */}
        {stats.total > 0 && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.resetButtonText}>Reset All Tasks (Clean Slate)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 26,
  },
  metricCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  rowTaskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  rowTaskDate: {
    fontSize: 11,
    color: '#64748B',
  },
  statusTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusTagDone: {
    backgroundColor: '#ECFDF5',
  },
  statusTagPending: {
    backgroundColor: '#FFF7ED',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusTagTextDone: {
    color: '#059669',
  },
  statusTagTextPending: {
    color: '#EA580C',
  },
  emptyFilterBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyFilterText: {
    fontSize: 14,
    color: '#64748B',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
