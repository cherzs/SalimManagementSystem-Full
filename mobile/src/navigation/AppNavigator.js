import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { COLORS } from '../styles/common';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DeductScreen from '../screens/DeductScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { isDarkMode } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDarkMode ? '#6b7280' : COLORS.text.secondary,
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 65 : 80,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? 10 : 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Deduct"
        component={DeductScreen}
        options={{
          tabBarLabel: 'Deduct',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'cube' : 'cube-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const navigationRef = useRef(null);
  const soundRef = useRef(null);
  const foregroundSubscription = useRef();
  const responseSubscription = useRef();
  const { setIncomingCall } = useApp();

  const playRingtone = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/ringtone.mp3'),
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  const stopRingtone = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const handleIncomingCall = async (notification) => {
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) return;

    let data = notification.request.content.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }

    stopRingtone();
    Vibration.vibrate([500, 500], true);
    playRingtone();
    setIncomingCall(data);

    navigationRef.current?.navigate('Main', {
      screen: 'HomeTab',
      params: { screen: 'Dashboard' },
    });
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'ringtone',
        vibrationPattern: [500, 500],
        lightColor: '#FF231F7C',
      }).catch(e => console.warn('Notification channel error:', e));
    }

    const setAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('Audio mode error:', e);
      }
    };
    setAudioMode();
  }, []);

  useEffect(() => {
    const registerForPushNotifications = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permission not granted!');
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('Expo Push Token:', tokenData.data);
      } catch (e) {
        console.warn('Push notification error:', e);
      }
    };

    registerForPushNotifications();

    foregroundSubscription.current = Notifications.addNotificationReceivedListener(handleIncomingCall);
    responseSubscription.current = Notifications.addNotificationResponseReceivedListener(async response => {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) return;

      let data = response.notification.request.content.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }

      stopRingtone();
      Vibration.cancel();
      setIncomingCall(data);

      navigationRef.current?.navigate('Main', {
        screen: 'HomeTab',
        params: { screen: 'Dashboard' },
      });
    });

    return () => {
      foregroundSubscription.current?.remove();
      responseSubscription.current?.remove();
      stopRingtone();
      Vibration.cancel();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
