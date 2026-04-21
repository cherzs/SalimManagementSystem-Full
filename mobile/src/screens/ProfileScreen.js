import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { commonStyles, COLORS, SPACING, BORDER_RADIUS } from '../styles/common';

export default function ProfileScreen({ navigation }) {
  const { isDarkMode, toggleTheme, employeeId, employeeName, logout } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['user', 'token', 'theme', 'employeeId', 'employeeName']);
              logout();
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout failed:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[commonStyles.safeArea, isDarkMode && commonStyles.safeAreaDark]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} style={{ flex: 1 }}>
        <Animated.View style={{ opacity: fadeAnim, flex: 1, transform: [{ translateY: slideAnim }] }}>
          <ScrollView style={commonStyles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, isDarkMode && commonStyles.titleDark]}>
                  Profile
                </Text>
                <Text style={[styles.subtitle, isDarkMode && commonStyles.subtitleDark]}>
                  Account settings
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.themeToggle}
              >
                <Ionicons
                  name={isDarkMode ? 'sunny' : 'moon'}
                  size={22}
                  color={isDarkMode ? COLORS.text.dark : COLORS.text.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Profile Card */}
            <Animated.View style={[styles.profileCard, isDarkMode && styles.profileCardDark, { opacity: fadeAnim }]}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.avatarText}>
                    {employeeName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.onlineDot} />
              </View>
              <Text style={[styles.employeeName, isDarkMode && commonStyles.titleDark]}>
                {employeeName}
              </Text>
              <Text style={[styles.employeeRole, isDarkMode && commonStyles.textSecondaryDark]}>
                Employee
              </Text>
            </Animated.View>

            {/* Info Card */}
            <View style={[commonStyles.card, isDarkMode && commonStyles.cardDark, styles.infoCard]}>
              <Text style={[styles.sectionTitle, isDarkMode && commonStyles.textDark]}>
                Employee Information
              </Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isDarkMode && commonStyles.textSecondaryDark]}>
                    Employee ID
                  </Text>
                  <Text style={[styles.infoValue, isDarkMode && commonStyles.textDark]}>
                    {employeeId}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name="id-card-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isDarkMode && commonStyles.textSecondaryDark]}>
                    Full Name
                  </Text>
                  <Text style={[styles.infoValue, isDarkMode && commonStyles.textDark]}>
                    {employeeName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Appearance */}
            <View style={[commonStyles.card, isDarkMode && commonStyles.cardDark, styles.sectionCard]}>
              <Text style={[styles.sectionTitle, isDarkMode && commonStyles.textDark]}>
                Appearance
              </Text>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={isDarkMode ? 'moon' : 'sunny'}
                    size={22}
                    color={isDarkMode ? COLORS.warning : COLORS.primary}
                  />
                  <View>
                    <Text style={[styles.settingLabel, isDarkMode && commonStyles.textDark]}>Dark Mode</Text>
                    <Text style={[styles.settingDesc, isDarkMode && commonStyles.textSecondaryDark]}>
                      {isDarkMode ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.toggleTrack, isDarkMode ? styles.toggleTrackOn : styles.toggleTrackOff]}>
                  <View style={[styles.toggleThumb, isDarkMode && styles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={[commonStyles.card, isDarkMode && commonStyles.cardDark, styles.sectionCard]}>
              <Text style={[styles.sectionTitle, isDarkMode && commonStyles.textDark]}>
                Quick Actions
              </Text>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('HomeTab', { screen: 'Dashboard' })}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="home-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionLabel, isDarkMode && commonStyles.textDark]}>Go to Home</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('Deduct')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                  <Ionicons name="cube-outline" size={20} color={COLORS.warning} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionLabel, isDarkMode && commonStyles.textDark]}>Deduct Items</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <Ionicons name="time-outline" size={20} color={COLORS.success} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionLabel, isDarkMode && commonStyles.textDark]}>View History</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity
              style={[styles.logoutButton]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={22} color={COLORS.text.light} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* App Info */}
            <View style={styles.appInfoContainer}>
              <View style={styles.appInfoRow}>
                <Ionicons name="cube-outline" size={16} color={COLORS.text.tertiary} />
                <Text style={[styles.appInfoText, isDarkMode && commonStyles.textSecondaryDark]}>
                  Salim Management System
                </Text>
              </View>
              <View style={styles.appInfoRow}>
                <Ionicons name="code-working-outline" size={16} color={COLORS.text.tertiary} />
                <Text style={[styles.appInfoText, isDarkMode && commonStyles.textSecondaryDark]}>
                  Version 2.0
                </Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  themeToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#ffffff',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
    marginBottom: SPACING.xl,
  },
  profileCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  avatarContainer: {
    marginBottom: SPACING.lg,
    position: 'relative',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 60,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  employeeName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  employeeRole: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoCard: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: SPACING.lg,
  },
  sectionCard: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: SPACING.xl,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: SPACING.lg,
  },
  dividerDark: {
    backgroundColor: '#334155',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  settingDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
    color: COLORS.text.secondary,
  },
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    padding: 4,
  },
  toggleTrackOn: {
    backgroundColor: COLORS.primary,
  },
  toggleTrackOff: {
    backgroundColor: '#e2e8f0',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 20,
    marginBottom: SPACING.xs,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 17,
  },
  appInfoContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
    opacity: 0.6,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  appInfoText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: SPACING.xs,
    letterSpacing: 0.5,
    color: COLORS.text.tertiary,
  },
});
