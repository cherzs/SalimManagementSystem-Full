import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { getItems, getTasks, updateTaskReadStatus, updateTaskCheckStatus, updateTaskDoneStatus } from '../api';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { commonStyles, COLORS, SPACING, BORDER_RADIUS } from '../styles/common';

const CACHE_ITEMS_KEY = 'cached_items';
const CACHE_TASKS_KEY = 'cached_tasks';

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
};

const loadFromCache = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache data', e);
  }
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function DashboardScreen({ navigation }) {
  const { isDarkMode, toggleTheme, employeeId, employeeName, incomingCall, setIncomingCall, hasDeducted, setHasDeducted } = useApp();
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const tasksPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const soundRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping ringtone:', error);
    }
  };

  const markVisibleTasksAsRead = async (tasks) => {
    if (!employeeId) return;
    try {
      const unreadTasks = tasks.filter(task => {
        const readByList = task.read_by_list || [];
        return !readByList.includes(employeeId);
      });
      await Promise.all(
        unreadTasks.map(task => updateTaskReadStatus(task.task_id, employeeId))
      );
    } catch (error) {
      console.log("Failed to update read status:", error);
    }
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    if (!isRefresh) {
      const [cachedItems, cachedTasks] = await Promise.all([
        loadFromCache(CACHE_ITEMS_KEY),
        loadFromCache(CACHE_TASKS_KEY),
      ]);

      if (Array.isArray(cachedItems)) setItems(cachedItems);
      if (Array.isArray(cachedTasks)) setTasks(cachedTasks);

      if (cachedItems || cachedTasks) {
        setLoading(false);
        setRefreshing(true);
      }
    }

    try {
      const [itemsResponse, tasksResponse] = await Promise.all([
        getItems(),
        getTasks({ employeeId }),
      ]);

      const newItems = Array.isArray(itemsResponse) ? itemsResponse : [];
      const newTasks = Array.isArray(tasksResponse) ? tasksResponse : [];

      setItems(prev => deepEqual(prev, newItems) ? prev : newItems);
      setTasks(prev => deepEqual(prev, newTasks) ? prev : newTasks);

      await Promise.all([
        saveToCache(CACHE_ITEMS_KEY, newItems),
        saveToCache(CACHE_TASKS_KEY, newTasks),
      ]);

      await markVisibleTasksAsRead(newTasks);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert("Error", "Failed to load data.");
    } finally {
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 300);
    }
  }, [employeeId]);

  const handleRefresh = () => loadData(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        stopRingtone();
        Vibration.cancel();
      };
    }, [loadData])
  );

  useEffect(() => {
    if (incomingCall) {
      playRingtone();
      Vibration.vibrate([500, 500], true);
    }
    return () => {
      stopRingtone();
      Vibration.cancel();
    };
  }, [incomingCall]);

  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(tasks.length / tasksPerPage);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleCheckTask = () => {
    Alert.alert(
      "Confirm Check",
      "Are you sure you want to check this task?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await updateTaskCheckStatus(selectedTask.task_id, employeeId);
              setTasks(prevTasks =>
                prevTasks.map(t =>
                  t.task_id === selectedTask.task_id
                    ? {
                        ...t,
                        checked_by_list: [...(t.checked_by_list || []), employeeId],
                        checked_by_count: (t.checked_by_count || 0) + 1,
                      }
                    : t
                )
              );
              setSelectedTask(prev => ({
                ...prev,
                checked_by_list: [...(prev.checked_by_list || []), employeeId],
                checked_by_count: (prev.checked_by_count || 0) + 1,
              }));
            } catch (error) {
              Alert.alert("Error", "Failed to check task.");
            }
          },
        },
      ]
    );
  };

  const handleDoneTask = () => {
    const isChecked = selectedTask?.checked_by_list?.includes(employeeId);
    if (!isChecked) {
      Alert.alert("Cannot Mark as Done", "Please check this task first before marking as done.");
      return;
    }
    if (!hasDeducted) {
      Alert.alert("Cannot Mark as Done", "Please complete the deduction for this task first.");
      return;
    }
    if (selectedTask?.done_by_list?.includes(employeeId)) {
      Alert.alert("Already Done", "You have already marked this task as done.");
      return;
    }
    
    Alert.alert(
      "Confirm Done",
      "Are you sure you want to mark this task as done?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await updateTaskDoneStatus(selectedTask.task_id, employeeId);
              setTasks(prevTasks =>
                prevTasks.map(t =>
                  t.task_id === selectedTask.task_id
                    ? {
                        ...t,
                        done_by_list: [...(t.done_by_list || []), employeeId],
                        done_by_count: (t.done_by_count || 0) + 1,
                      }
                    : t
                )
              );
              setSelectedTask(prev => ({
                ...prev,
                done_by_list: [...(prev.done_by_list || []), employeeId],
                done_by_count: (prev.done_by_count || 0) + 1,
              }));
              setHasDeducted(false);
            } catch (error) {
              Alert.alert("Error", "Failed to mark task as done.");
            }
          },
        },
      ]
    );
  };

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeTaskModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTaskModal(false));
  };

  const handleAnswerCall = () => {
    stopRingtone();
    Vibration.cancel();
    setIncomingCall(null);
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const checkedByMe = tasks.filter(t => t.checked_by_list?.includes(employeeId));
  const doneByMe = tasks.filter(t => t.done_by_list?.includes(employeeId));
  const unreadTasks = tasks.filter(t => !(t.read_by_list || []).includes(employeeId));

  if (loading) {
    return (
      <SafeAreaView style={[styles.rootContainer, isDarkMode && styles.rootContainerDark]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={50} color={COLORS.primary} />
          <Text style={[styles.loadingText, isDarkMode && commonStyles.textSecondaryDark]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.rootContainer, isDarkMode && styles.rootContainerDark]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={commonStyles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.avatarText}>
                {employeeName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View>
              <Text style={[styles.greeting, isDarkMode && commonStyles.textSecondaryDark]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.userName, isDarkMode && commonStyles.titleDark]}>
                {employeeName}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.themeToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={22}
              color={isDarkMode ? COLORS.text.dark : COLORS.text.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Refreshing Badge */}
        {refreshing && (
          <View style={styles.refreshBadge}>
            <ActivityIndicator size="small" color={COLORS.text.light} />
            <Text style={styles.refreshText}>Syncing…</Text>
          </View>
        )}

        {/* Stats Cards */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          <View style={[styles.statCard, { backgroundColor: `${COLORS.primary}15` }]}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>{pendingTasks.length}</Text>
            <Text style={[styles.statLabel, isDarkMode && commonStyles.textSecondaryDark]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${COLORS.warning}15` }]}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>{checkedByMe.length}</Text>
            <Text style={[styles.statLabel, isDarkMode && commonStyles.textSecondaryDark]}>Checked</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${COLORS.success}15` }]}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{doneByMe.length}</Text>
            <Text style={[styles.statLabel, isDarkMode && commonStyles.textSecondaryDark]}>Done</Text>
          </View>
          {unreadTasks.length > 0 && (
            <View style={[styles.statCard, { backgroundColor: `${COLORS.danger}15` }]}>
              <Text style={[styles.statNumber, { color: COLORS.danger }]}>{unreadTasks.length}</Text>
              <Text style={[styles.statLabel, isDarkMode && commonStyles.textSecondaryDark]}>New</Text>
            </View>
          )}
        </Animated.View>

        {/* Tasks */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDarkMode && commonStyles.titleDark]}>
              Your Tasks
            </Text>

            {currentTasks.length > 0 ? (
              currentTasks.map(task => (
                <TouchableOpacity
                  key={task.task_id}
                  style={[
                    styles.taskItem,
                    isDarkMode && styles.taskItemDark,
                    task.status === 'completed' && styles.completedTask,
                  ]}
                  onPress={() => openTaskModal(task)}
                  activeOpacity={0.8}
                >
                  <View style={styles.taskCardHeader}>
                    <View style={styles.taskTitleRow}>
                      <Text style={[styles.taskTitle, isDarkMode && commonStyles.textDark]}>
                        {task.title}
                      </Text>
                      {!(task.read_by_list || []).includes(employeeId) && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: task.status === 'completed' ? `${COLORS.success}20` : `${COLORS.warning}20` }
                    ]}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: task.status === 'completed' ? COLORS.success : COLORS.warning }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        { color: task.status === 'completed' ? COLORS.success : COLORS.warning }
                      ]}>
                        {task.status === 'completed' ? 'Done' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.taskDesc, isDarkMode && commonStyles.textSecondaryDark]} numberOfLines={2}>
                    {task.description || "No description provided"}
                  </Text>

                  {task.items && task.items.length > 0 && (
                    <View style={styles.itemsRow}>
                      {task.items.slice(0, 3).map((item, index) => (
                        <View key={item.item_id || index} style={[styles.itemTag, isDarkMode && styles.itemTagDark]}>
                          <Text style={[styles.itemTagText, isDarkMode && commonStyles.textSecondaryDark]}>
                            {item.item_name}
                          </Text>
                        </View>
                      ))}
                      {task.items.length > 3 && (
                        <Text style={[styles.moreText, isDarkMode && commonStyles.textSecondaryDark]}>
                          +{task.items.length - 3} more
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.taskFooter}>
                    <Text style={[styles.taskDate, isDarkMode && commonStyles.textSecondaryDark]}>
                      {new Date(task.assigned_at).toLocaleDateString()}
                    </Text>
                    {(task.checked_by_list || []).includes(employeeId) && (
                      <View style={styles.checkedIndicator}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      </View>
                    )}
                    {(task.done_by_list || []).includes(employeeId) && (
                      <View style={styles.doneIndicator}>
                        <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={commonStyles.emptyState}>
                <Ionicons name="clipboard-outline" size={60} color={COLORS.text.secondary} />
                <Text style={[commonStyles.emptyStateText, isDarkMode && commonStyles.emptyStateTextDark]}>
                  No tasks assigned
                </Text>
              </View>
            )}

            {/* Pagination */}
            {tasks.length > tasksPerPage && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.pageButton, currentPage === 1 && [styles.disabledPageButton, isDarkMode && { backgroundColor: '#374151' }]]}
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.text.tertiary : COLORS.text.light} />
                  <Text style={[styles.pageButtonText, currentPage === 1 && styles.disabledPageText]}>Prev</Text>
                </TouchableOpacity>

                <View style={styles.pageIndicator}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pageDot,
                        currentPage === i + 1 && styles.activePageDot,
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.pageButton, currentPage === totalPages && [styles.disabledPageButton, isDarkMode && { backgroundColor: '#374151' }]]}
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pageButtonText, currentPage === totalPages && styles.disabledPageText]}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.text.tertiary : COLORS.text.light} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Incoming Call Modal */}
      <Modal visible={!!incomingCall} transparent animationType="fade">
        <View style={styles.callOverlay}>
          <View style={[styles.callCard, isDarkMode && styles.callCardDark]}>
            <View style={styles.callIconContainer}>
              <Ionicons name="call" size={32} color={COLORS.primary} />
            </View>
            <Text style={[styles.callTitle, isDarkMode && commonStyles.titleDark]}>
              Incoming Task
            </Text>
            <Text style={[styles.callTaskName, isDarkMode && commonStyles.textDark]}>
              {incomingCall?.taskTitle || "New Task"}
            </Text>
            <Text style={[styles.callDescription, isDarkMode && commonStyles.textSecondaryDark]}>
              {incomingCall?.taskDescription || "You have a new task assigned"}
            </Text>
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleAnswerCall}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={22} color={COLORS.text.light} />
              <Text style={styles.callButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={showTaskModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, isDarkMode && styles.modalContentDark, { transform: [{ scale: modalAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && commonStyles.titleDark]}>
                {selectedTask?.title}
              </Text>
              <TouchableOpacity onPress={closeTaskModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDarkMode ? COLORS.text.tertiary : COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={[
              styles.modalStatusBadge,
              {
                backgroundColor: selectedTask?.status === 'completed' ? `${COLORS.success}20` : `${COLORS.warning}20`,
              }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: selectedTask?.status === 'completed' ? COLORS.success : COLORS.warning }
              ]} />
              <Text style={{
                color: selectedTask?.status === 'completed' ? COLORS.success : COLORS.warning,
                fontWeight: '600',
                fontSize: 13,
              }}>
                {selectedTask?.status === 'completed' ? 'Completed' : 'Pending'}
              </Text>
            </View>

            <Text style={[styles.modalDesc, isDarkMode && commonStyles.textSecondaryDark]}>
              {selectedTask?.description || "No description"}
            </Text>

            {selectedTask?.items?.length > 0 && (
              <View style={styles.modalItemsContainer}>
                <Text style={[styles.modalSectionTitle, isDarkMode && commonStyles.textDark]}>Required Items</Text>
                <View style={styles.modalItemsList}>
                  {selectedTask.items.map((item, i) => (
                    <View key={i} style={[styles.modalItemRow, isDarkMode && styles.modalItemRowDark]}>
                      <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
                      <Text style={[styles.modalItemText, isDarkMode && commonStyles.textDark]}>{item.item_name}</Text>
                      <Text style={[styles.modalItemQty, isDarkMode && commonStyles.textSecondaryDark]}>x{item.required_qty}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={[styles.modalDate, isDarkMode && commonStyles.textSecondaryDark]}>
              Assigned: {selectedTask?.assigned_at ? new Date(selectedTask.assigned_at).toLocaleDateString() : 'N/A'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => {
                  closeTaskModal();
                  navigation.navigate('Deduct');
                }}
              >
                <Ionicons name="cube-outline" size={18} color={COLORS.text.light} />
                <Text style={styles.modalActionText}>Deduct Item</Text>
              </TouchableOpacity>

              {selectedTask?.checked_by_list && !selectedTask.checked_by_list.includes(employeeId) ? (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: COLORS.warning }]}
                  onPress={handleCheckTask}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.text.light} />
                  <Text style={styles.modalActionText}>Check Task</Text>
                </TouchableOpacity>
              ) : (
                selectedTask?.checked_by_list?.includes(employeeId) && (
                  <View style={[styles.modalActionBtn, { backgroundColor: `${COLORS.success}20` }]}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={[styles.modalActionText, { color: COLORS.success }]}>Checked</Text>
                  </View>
                )
              )}

              {selectedTask?.checked_by_list?.includes(employeeId) && hasDeducted &&
                !(selectedTask?.done_by_list?.includes(employeeId)) && (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: COLORS.success }]}
                  onPress={handleDoneTask}
                >
                  <Ionicons name="checkmark-done" size={18} color={COLORS.text.light} />
                  <Text style={styles.modalActionText}>Mark as Done</Text>
                </TouchableOpacity>
              )}

              {selectedTask?.done_by_list?.includes(employeeId) && (
                <View style={[styles.modalActionBtn, { backgroundColor: `${COLORS.primary}20` }]}>
                  <Ionicons name="checkmark-done-circle" size={18} color={COLORS.primary} />
                  <Text style={[styles.modalActionText, { color: COLORS.primary }]}>Task Done</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}
                onPress={closeTaskModal}
              >
                <Text style={[styles.modalActionText, { color: isDarkMode ? COLORS.text.dark : COLORS.text.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  rootContainerDark: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: COLORS.text.light,
    fontSize: 22,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: COLORS.text.primary,
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
  refreshBadge: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshText: {
    color: COLORS.text.light,
    marginLeft: 8,
    fontWeight: '700',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: SPACING.xs,
    borderRadius: 28,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
    color: COLORS.text.secondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: SPACING.lg,
    letterSpacing: -0.5,
    color: COLORS.text.primary,
  },
  taskItem: {
    backgroundColor: '#ffffff',
    padding: SPACING.xl,
    borderRadius: 32,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 6,
  },
  taskItemDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  completedTask: {
    opacity: 0.65,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  taskTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginRight: SPACING.sm,
  },
  taskTitle: {
    fontWeight: '800',
    fontSize: 18,
    flex: 1,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  newBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  taskDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.md,
    color: COLORS.text.secondary,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  itemTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  itemTagDark: {
    backgroundColor: '#334155',
  },
  itemTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  taskDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  checkedIndicator: {
    marginLeft: SPACING.xs,
  },
  doneIndicator: {
    marginLeft: SPACING.xs,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledPageButton: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  pageButtonText: {
    color: COLORS.text.light,
    fontWeight: '700',
    fontSize: 14,
  },
  disabledPageText: {
    color: '#94a3b8',
  },
  pageIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  activePageDot: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  callOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callCard: {
    backgroundColor: '#ffffff',
    width: '85%',
    padding: 32,
    borderRadius: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  callCardDark: {
    backgroundColor: '#1e293b',
  },
  callIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
  },
  callTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
    color: COLORS.text.primary,
  },
  callTaskName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
    color: COLORS.primary,
  },
  callDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    color: COLORS.text.secondary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  callButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: SPACING.xl,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
    paddingRight: SPACING.md,
    lineHeight: 30,
    color: COLORS.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  modalDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.lg,
    color: COLORS.text.secondary,
  },
  modalItemsContainer: {
    marginBottom: SPACING.xl,
    backgroundColor: '#f8fafc',
    padding: SPACING.lg,
    borderRadius: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#64748b',
  },
  modalItemsList: {
    gap: SPACING.sm,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  modalItemRowDark: {
    backgroundColor: '#334155',
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalItemQty: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xl,
    color: '#94a3b8',
    textAlign: 'center',
  },
  modalActions: {
    gap: SPACING.md,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: 24,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#ffffff',
  },
});
