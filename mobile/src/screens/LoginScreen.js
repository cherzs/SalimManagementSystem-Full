import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, StatusBar } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Alert, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Animated, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login, registerPushToken } from '../api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../styles/common';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { isDarkMode, toggleTheme, login: appLogin } = useApp();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPinFocused, setIsPinFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  
  // Background floating animations
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startFloatingAnimations();
    
    const checkLogin = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        appLogin(user.id, user.name);
        navigation.replace('Main');
      } else {
        Animated.stagger(200, [
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.spring(logoAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
          Animated.spring(cardAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.timing(formAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ]).start();
      }
    };

    const handleNotification = (notification) => {
      console.log('Notification received:', notification);
    };

    const subscription = Notifications.addNotificationReceivedListener(handleNotification);
    checkLogin();
    return () => subscription.remove();
  }, []);

  const startFloatingAnimations = () => {
    const createFloat = (anim, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: duration, useNativeDriver: true })
        ])
      ).start();
    };
    createFloat(floatAnim1, 6000);
    createFloat(floatAnim2, 8000);
    createFloat(floatAnim3, 7000);
  };

  const handleLogin = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert("Error", "Please enter a 4-digit PIN");
      return;
    }

    setLoading(true);
    try {
      const user = await login(name, pin);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      appLogin(user.id, user.name);

      try {
        await registerForPushNotifications(user.id);
      } catch (pushErr) {
        console.warn('Push registration failed:', pushErr);
      }

      navigation.replace('Main');
    } catch (loginErr) {
      console.error("Login error:", loginErr);
      Alert.alert("Login Failed", loginErr.message || "Unknown error");
    }
    setLoading(false);
  };

  const registerForPushNotifications = async (employeeId) => {
    if (!Device.isDevice) return;

    let { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    try {
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: '471ce07a-663f-44df-b58c-984bb1257a2a'
      })).data;

      await registerPushToken(employeeId, token);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          showBadge: true,
          enableLights: true,
          enableVibrate: true,
        });
      }

      if (Platform.OS === 'ios') {
        const { status: iosStatus } = await Notifications.getPermissionsAsync();
        if (iosStatus !== 'granted') {
          Alert.alert('Warning', 'iOS notification permissions not granted');
        }
      }

      return token;
    } catch (error) {
      console.error('Error during push notification registration:', error);
      return null;
    }
  };

  // Derived animation styles
  const floatStyle1 = {
    transform: [
      { translateY: floatAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
      { scale: floatAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }
    ]
  };
  const floatStyle2 = {
    transform: [
      { translateX: floatAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
      { translateY: floatAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }
    ]
  };
  const floatStyle3 = {
    transform: [
      { translateX: floatAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, 25] }) },
      { scale: floatAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
    ]
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'}
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={{ opacity: fadeAnim, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            
            {/* Animated Background Elements */}
            <View style={styles.backgroundDecoration}>
              <Animated.View style={[styles.circle, styles.circle1, isDarkMode && styles.circleDark, floatStyle1]} />
              <Animated.View style={[styles.circle, styles.circle2, isDarkMode && styles.circleDark, floatStyle2]} />
              <Animated.View style={[styles.circle, styles.circle3, isDarkMode && styles.circleDark, floatStyle3]} />
            </View>

            {/* Header / Logo Section */}
            <Animated.View style={{ 
              alignItems: 'center',
              transform: [
                { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }
              ] 
            }}>
              <View style={styles.logoWrapper}>
                <View style={[styles.logoGradient, isDarkMode && styles.logoGradientDark]}>
                  <Ionicons name="finger-print" size={54} color={isDarkMode ? '#60a5fa' : '#ffffff'} />
                </View>
                {/* Decorative floating dots around logo */}
                <View style={styles.logoDot1} />
                <View style={styles.logoDot2} />
              </View>
              <Text style={[styles.brandTitle, isDarkMode && styles.brandTitleDark]}>
                Salim MS
              </Text>
              <Text style={[styles.brandSubtitle, isDarkMode && styles.brandSubtitleDark]}>
                Employee Portal
              </Text>
            </Animated.View>

            {/* Glassmorphism Card */}
            <Animated.View style={[
              styles.card, 
              isDarkMode && styles.cardDark, 
              { 
                transform: [
                  { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) },
                  { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }
                ],
                opacity: formAnim
              }
            ]}>
              
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>Welcome</Text>
                  <Text style={[styles.cardSubtitle, isDarkMode && styles.cardSubtitleDark]}>Sign in to continue</Text>
                </View>
                <TouchableOpacity style={[styles.themeToggle, isDarkMode && styles.themeToggleDark]} onPress={toggleTheme}>
                  <Ionicons
                    name={isDarkMode ? 'sunny' : 'moon'}
                    size={20}
                    color={isDarkMode ? '#fbbf24' : '#6b7280'}
                  />
                </TouchableOpacity>
              </View>

              <View style={[
                styles.inputWrapper, 
                isDarkMode && styles.inputWrapperDark,
                isNameFocused && { borderColor: COLORS.primary }
              ]}>
                <Ionicons name="person-outline" size={20} color={isNameFocused ? COLORS.primary : (isDarkMode ? '#9ca3af' : '#6b7280')} style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your name"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  autoCapitalize="words"
                />
              </View>

              <View style={[
                styles.inputWrapper, 
                isDarkMode && styles.inputWrapperDark,
                isPinFocused && { borderColor: COLORS.primary }
              ]}>
                <Ionicons name="keypad-outline" size={20} color={isPinFocused ? COLORS.primary : (isDarkMode ? '#9ca3af' : '#6b7280')} style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter 4-digit PIN"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  keyboardType="numeric"
                  value={pin}
                  onChangeText={setPin}
                  onFocus={() => setIsPinFocused(true)}
                  onBlur={() => setIsPinFocused(false)}
                  maxLength={4}
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.loginBtn,
                  isDarkMode && styles.loginBtnDark,
                  loading && { opacity: 0.7 }
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.loginBtnContent}>
                    <Text style={styles.loginBtnText}>Secure Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>

            </Animated.View>
            
            <Animated.View style={[styles.footer, { opacity: formAnim }]}>
              <Text style={[styles.footerText, isDarkMode && styles.footerTextDark]}>
                Protected by Salim Security
              </Text>
            </Animated.View>

          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circle1: {
    width: width * 1.5,
    height: width * 1.5,
    backgroundColor: `${COLORS.primary}10`,
    top: -width * 0.4,
    right: -width * 0.5,
    transform: [{ rotate: '-10deg' }]
  },
  circle2: {
    width: width * 1.2,
    height: width * 1.2,
    backgroundColor: `${COLORS.secondary}10`,
    bottom: -width * 0.3,
    left: -width * 0.4,
  },
  circle3: {
    width: width,
    height: width,
    backgroundColor: `${COLORS.info}10`,
    top: height * 0.25,
    left: width * 0.2,
  },
  circleDark: {
    opacity: 0.5,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    transform: [{ rotate: '5deg' }],
  },
  logoGradientDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.5,
  },
  logoDot1: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.secondary,
    top: -5,
    right: -5,
  },
  logoDot2: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    bottom: 5,
    left: -10,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandTitleDark: {
    color: '#f8fafc',
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandSubtitleDark: {
    color: '#94a3b8',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 32,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    marginTop: 40,
    shadowColor: '#cbd5e1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: 'rgba(51, 65, 85, 0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleDark: {
    backgroundColor: '#334155',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardTitleDark: {
    color: '#f8fafc',
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  cardSubtitleDark: {
    color: '#94a3b8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    height: 64,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
    height: '100%',
  },
  inputDark: {
    color: '#f8fafc',
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    height: 64,
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  loginBtnDark: {
    backgroundColor: '#3b82f6',
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
    marginRight: 8,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 1,
  },
  footerTextDark: {
    color: '#64748b',
  },
});
