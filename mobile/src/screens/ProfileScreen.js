import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
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
    <SafeAreaView style={[commonStyles.safeArea, isDarkMode && commonStyles.safeAreaDark]}>
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
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.card.light,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: SPACING.lg,
  },
  profileCardDark: {
    backgroundColor: COLORS.card.dark,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    color: COLORS.text.light,
    fontSize: 38,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.card.light,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  employeeRole: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  infoCard: {
    paddingVertical: SPACING.lg,
  },
  sectionCard: {
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.md,
  },
  dividerDark: {
    backgroundColor: COLORS.border.dark,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackOn: {
    backgroundColor: COLORS.primary,
  },
  toggleTrackOff: {
    backgroundColor: '#d1d5db',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  logoutButtonText: {
    color: COLORS.text.light,
    fontWeight: '700',
    fontSize: 16,
  },
  appInfoContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  appInfoText: {
    fontSize: 13,
    marginLeft: SPACING.sm,
  },
});
