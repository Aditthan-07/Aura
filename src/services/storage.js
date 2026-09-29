import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@aura_tasks_v1';

/**
 * Retrieve all tasks from local storage
 * @returns {Promise<Array>} Array of task objects
 */
export const getTasks = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error reading tasks from storage:', e);
    return [];
  }
};

/**
 * Persist an array of tasks to local storage
 * @param {Array} tasks 
 */
export const saveTasks = async (tasks) => {
  try {
    const jsonValue = JSON.stringify(tasks);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving tasks to storage:', e);
  }
};

/**
 * Add a new task to storage
 * @param {Object} taskData { title, date, time, priority, notificationId }
 * @returns {Promise<Object>} The created task object
 */
export const addTask = async ({ title, date, time, priority = 'medium', notificationId = null }) => {
  const tasks = await getTasks();
  const newTask = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
    title: title.trim(),
    date: date || new Date().toISOString().split('T')[0],
    time: time || '12:00 PM',
    priority: priority || 'medium', // 'high' | 'medium' | 'low'
    status: 'pending', // 'pending' | 'completed'
    notificationId,
    createdAt: new Date().toISOString(),
  };
  const updatedTasks = [newTask, ...tasks];
  await saveTasks(updatedTasks);
  return newTask;
};

/**
 * Sort tasks with high priority first, followed by medium and low
 * @param {Array} tasks 
 * @returns {Array} Sorted copy of tasks
 */
export const sortTasksByPriority = (tasks = []) => {
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  return [...tasks].sort((a, b) => {
    const weightA = priorityWeight[a.priority] || 2;
    const weightB = priorityWeight[b.priority] || 2;
    return weightB - weightA;
  });
};

/**
 * Toggle a task between 'pending' and 'completed'
 * @param {string} id 
 * @returns {Promise<Array>} The updated tasks array
 */
export const toggleTaskStatus = async (id) => {
  const tasks = await getTasks();
  const updated = tasks.map((t) => {
    if (t.id === id) {
      const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
      return {
        ...t,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
      };
    }
    return t;
  });
  await saveTasks(updated);
  return updated;
};

/**
 * Delete a task by ID
 * @param {string} id 
 * @returns {Promise<Array>} Remaining tasks
 */
export const deleteTask = async (id) => {
  const tasks = await getTasks();
  const remaining = tasks.filter((t) => t.id !== id);
  await saveTasks(remaining);
  return remaining;
};

/**
 * Clear all tasks from storage (resets to empty state)
 */
export const clearTasks = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing tasks:', e);
  }
};

/**
 * Compute summary statistics from current task set
 * @returns {Promise<Object>} { total, pending, completed, completionRate, streak }
 */
export const getStats = async () => {
  const tasks = await getTasks();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const highPriority = tasks.filter((t) => t.priority === 'high' && t.status === 'pending').length;

  // Calculate distinct active days
  const activeDays = new Set(tasks.map((t) => t.date)).size;

  return {
    total,
    pending,
    completed,
    completionRate,
    highPriority,
    streak: activeDays,
  };
};
