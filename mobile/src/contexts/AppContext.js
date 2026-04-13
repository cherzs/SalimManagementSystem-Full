import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/common';

const THEME_KEY = '@theme';

const AppContext = createContext(null);

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

export function AppProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [employeeName, setEmployeeName] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [hasDeducted, setHasDeducted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const theme = await AsyncStorage.getItem(THEME_KEY);
        if (theme === 'dark') setIsDarkMode(true);
      } catch (e) {
        console.error('Failed to load theme', e);
      }
      setLoaded(true);
    };
    init();
  }, []);

  const toggleTheme = async () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    try {
      await AsyncStorage.setItem(THEME_KEY, newVal ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const login = (id, name) => {
    setEmployeeId(id);
    setEmployeeName(name);
  };

  const logout = () => {
    setEmployeeId(null);
    setEmployeeName(null);
    setHasDeducted(false);
    setIncomingCall(null);
  };

  if (!loaded) return <SplashScreen />;

  return (
    <AppContext.Provider value={{
      isDarkMode,
      toggleTheme,
      employeeId,
      employeeName,
      login,
      logout,
      incomingCall,
      setIncomingCall,
      hasDeducted,
      setHasDeducted,
    }}>
      {children}
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
