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
 * @param {Object} taskData { title, date, time, notificationId }
 * @returns {Promise<Object>} The created task object
 */
export const addTask = async ({ title, date, time, notificationId = null }) => {
  const tasks = await getTasks();
  const newTask = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
    title: title.trim(),
    date: date || new Date().toISOString().split('T')[0],
    time: time || '12:00 PM',
    status: 'pending', // 'pending' | 'completed'
    notificationId,
    createdAt: new Date().toISOString(),
  };
  const updatedTasks = [newTask, ...tasks];
  await saveTasks(updatedTasks);
  return newTask;
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

  // Calculate distinct active days
  const activeDays = new Set(tasks.map((t) => t.date)).size;

  return {
    total,
    pending,
    completed,
    completionRate,
    streak: activeDays,
  };
};
