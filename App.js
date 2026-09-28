import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import SplashScreen from './src/components/SplashScreen';
import TodayScreen from './src/screens/TodayScreen';
import AddTaskScreen from './src/screens/AddTaskScreen';
import StatsScreen from './src/screens/StatsScreen';
import { registerForPushNotificationsAsync } from './src/services/notifications';

const Tab = createBottomTabNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Request notification permissions on app mount
    registerForPushNotificationsAsync();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const screenOptions = ({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: '#10B981', // Aura Emerald Green
    tabBarInactiveTintColor: '#94A3B8', // Slate
    tabBarStyle: styles.tabBar,
    tabBarLabelStyle: styles.tabBarLabel,
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;

      if (route.name === 'Today') {
        iconName = focused ? 'clipboard' : 'clipboard-outline';
      } else if (route.name === 'AddTask') {
        iconName = focused ? 'add-circle' : 'add-circle-outline';
      } else if (route.name === 'Stats') {
        iconName = focused ? 'bar-chart' : 'bar-chart-outline';
      }

      return <Ionicons name={iconName} size={size || 24} color={color} />;
    },
  });

  return (
    <View style={styles.appWrapper}>
      <StatusBar style="dark" />
      <View style={styles.mobileContainer}>
        <NavigationContainer>
          <Tab.Navigator screenOptions={screenOptions} initialRouteName="Today">
            <Tab.Screen
              name="Today"
              component={TodayScreen}
              options={{ tabBarLabel: 'Today' }}
            />
            <Tab.Screen
              name="AddTask"
              component={AddTaskScreen}
              options={{ tabBarLabel: 'Add Task' }}
            />
            <Tab.Screen
              name="Stats"
              component={StatsScreen}
              options={{ tabBarLabel: 'Analytics' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: '#0F172A', // Outer dark backdrop on desktop web
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 460 : '100%', // Centered phone viewport on desktop
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    // Mobile frame shadow on web
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
        }
      : {}),
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
