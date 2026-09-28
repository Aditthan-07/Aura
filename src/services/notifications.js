import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the OS
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for notification!');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('aura-reminders', {
        name: 'Aura Task Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return true;
  } catch (error) {
    console.warn('Error configuring notifications:', error);
    return false;
  }
};

/**
 * Parse a date string (YYYY-MM-DD) and time string (e.g. '06:00 PM', '14:00') into a Date object
 * @param {string} dateStr 
 * @param {string} timeStr 
 * @returns {Date|null}
 */
export const parseTaskDateTime = (dateStr, timeStr) => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const cleanTime = (timeStr || '12:00 PM').trim().toUpperCase();

    let hours = 12;
    let minutes = 0;

    // Check AM/PM format
    const ampmMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      const isPM = ampmMatch[3] === 'PM';

      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;

      hours = h;
      minutes = m;
    } else {
      // Check 24-hour format (e.g. 14:00)
      const h24Match = cleanTime.match(/(\d{1,2}):(\d{2})/);
      if (h24Match) {
        hours = parseInt(h24Match[1], 10);
        minutes = parseInt(h24Match[2], 10);
      }
    }

    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0);
    return isNaN(scheduledDate.getTime()) ? null : scheduledDate;
  } catch (e) {
    console.warn('Error parsing datetime:', e);
    return null;
  }
};

/**
 * Schedule a local notification 30 minutes before task time
 * @param {Object} task { id, title, date, time }
 * @returns {Promise<string|null>} Scheduled notification ID
 */
export const scheduleTaskReminder = async (task) => {
  if (Platform.OS === 'web') {
    console.log(`[Web] Scheduled local reminder for "${task.title}" at ${task.time}`);
    return 'web_reminder_' + Date.now();
  }

  try {
    const scheduledDateTime = parseTaskDateTime(task.date, task.time);
    if (!scheduledDateTime) return null;

    // Calculate 30 minutes prior to scheduled time
    const triggerTime = new Date(scheduledDateTime.getTime() - 30 * 60 * 1000);
    const now = new Date();

    // Only schedule if the trigger time is in the future
    if (triggerTime <= now) {
      console.log('Reminder time is in the past; skipping schedule.');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Aura Reminder',
        body: `${task.title} is scheduled in 30 minutes!`,
        sound: true,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });

    console.log(`Notification scheduled with ID: ${notificationId} for ${triggerTime.toLocaleTimeString()}`);
    return notificationId;
  } catch (error) {
    console.warn('Failed to schedule local notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled local notification
 * @param {string} notificationId 
 */
export const cancelTaskReminder = async (notificationId) => {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Failed to cancel notification:', e);
  }
};
