import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHistory } from '../api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { COLORS, SPACING } from '../styles/common';

const PAGE_SIZE = 10;
const CACHE_HISTORY_KEY = 'history_cached_data';

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
};

const loadFromCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToCache = async (data) => {
  try {
    await AsyncStorage.setItem(CACHE_HISTORY_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache history', e);
  }
};

export default function HistoryScreen({ route }) {
  const { isDarkMode, toggleTheme, employeeId, employeeName } = useApp();
  const [allHistory, setAllHistory] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const flatListRef = useRef(null);

  const startFadeIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const backgroundRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      const data = await getHistory({ employeeId });
      const safeData = Array.isArray(data) ? data : [];
      if (!deepEqual(allHistory, safeData)) {
        setAllHistory(safeData);
        await saveToCache(safeData);
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [allHistory, loading, refreshing, employeeId]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getHistory({ employeeId });
      const safeData = Array.isArray(data) ? data : [];
      setAllHistory(safeData);
      await saveToCache(safeData);
    } catch (error) {
      console.error('Pull refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const cached = await loadFromCache();
    if (Array.isArray(cached)) {
      setAllHistory(cached);
      setFiltered(cached);
      setPage(1);
      setLoading(false);
      startFadeIn();
    }
    try {
      const data = await getHistory({ employeeId });
      const safeData = Array.isArray(data) ? data : [];
      if (!deepEqual(cached, safeData)) {
        setAllHistory(safeData);
        await saveToCache(safeData);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
      if (!cached) startFadeIn();
    }
  }, [employeeId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const interval = setInterval(backgroundRefresh, 30000);
    return () => clearInterval(interval);
  }, [backgroundRefresh]);

  useEffect(() => {
    const lower = query.toLowerCase();
    const result = allHistory.filter(
      item =>
        (item.employee_name || '').toLowerCase().includes(lower) ||
        (item.item_name || '').toLowerCase().includes(lower) ||
        (item.action || '').toLowerCase().includes(lower)
    );
    setFiltered(result);
    setPage(1);
  }, [query, allHistory]);

  const loadMore = () => {
    if (page * PAGE_SIZE >= filtered.length) return;
    setPage(prev => prev + 1);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }) => {
    const isDeduct = item.action === 'deduct';
    return (
      <View style={[styles.historyCard, isDarkMode && styles.historyCardDark]}>
        <View style={styles.historyLeft}>
          <View style={[styles.actionIcon, { backgroundColor: isDeduct ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <Ionicons
              name={isDeduct ? 'remove-circle' : 'add-circle'}
              size={24}
              color={isDeduct ? COLORS.danger : COLORS.success}
            />
          </View>
          <View style={styles.historyInfo}>
            <Text style={[styles.itemName, isDarkMode && styles.textLight]} numberOfLines={1}>
              {item.item_name}
            </Text>
            <View style={styles.historyMeta}>
              <Text style={[styles.metaText, isDarkMode && styles.textDimmed]}>
                {item.employee_name}
              </Text>
              <Text style={[styles.metaDot, isDarkMode && styles.textDimmed]}>·</Text>
              <Text style={[styles.metaText, isDarkMode && styles.textDimmed]}>
                {formatDate(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.qtySection}>
          <Text style={[styles.qty, isDeduct ? styles.qtyDeduct : styles.qtyRestock]}>
            {isDeduct ? `-${item.qty}` : `+${item.qty}`}
          </Text>
          <Text style={[styles.actionLabel, isDarkMode && styles.textDimmed]}>
            {item.action}
          </Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.textLight]}>
            History
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.textDimmed]}>
            Activity log for {employeeName}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={22}
            color={isDarkMode ? '#f8fafc' : '#1e293b'}
          />
        </TouchableOpacity>
      </View>

      {/* Refreshing Badge */}
      {refreshing && !loading && (
        <View style={styles.refreshBadge}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.refreshBadgeText}>Updating...</Text>
        </View>
      )}

      {/* Modern Search Box */}
      <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
        <Ionicons name="search" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        <TextInput
          placeholder="Search activity..."
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, isDarkMode && styles.textLight]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={20} color={isDarkMode ? '#475569' : '#cbd5e1'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, isDarkMode && styles.textDimmed]}>Total Records</Text>
          <Text style={styles.statValue}>{filtered.length}</Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, isDarkMode && styles.textDimmed]}>Showing</Text>
          <Text style={styles.statValue}>{Math.min(page * PAGE_SIZE, filtered.length)}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>All Operations</Text>
    </View>
  );

  const ListFooter = () => (
    <View style={{ paddingBottom: 40 }}>
      {page * PAGE_SIZE < filtered.length && (
        <TouchableOpacity
          style={[styles.loadMoreBtn, isDarkMode && styles.loadMoreBtnDark]}
          onPress={loadMore}
          activeOpacity={0.7}
        >
          <Text style={[styles.loadMoreText, isDarkMode && styles.textLight]}>
            Load More ({(filtered.length - page * PAGE_SIZE).toString()} remaining)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.rootContainer, isDarkMode && styles.rootContainerDark]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={40} color={COLORS.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.textDimmed]}>
            Loading history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.rootContainer, isDarkMode && styles.rootContainerDark]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <Animated.View style={{ opacity: fadeAnim, flex: 1, transform: [{ translateY: slideAnim }] }}>
              <FlatList
                ref={flatListRef}
                data={filtered.slice(0, page * PAGE_SIZE)}
                keyExtractor={item => item.id || item.timestamp.toString()}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooter}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onPullRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={60} color={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <Text style={[styles.emptyStateText, isDarkMode && styles.textDimmed]}>
                      {query ? 'No history matches your search.' : 'No activity recorded yet.'}
                    </Text>
                  </View>
                }
              />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  listContent: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  refreshBadgeText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    shadowOpacity: 0.2,
    shadowColor: '#000',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statsCardDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: 'rgba(51, 65, 85, 0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    height: '80%',
    alignSelf: 'center',
  },
  statDividerDark: {
    backgroundColor: '#334155',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  historyCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#334155',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  metaDot: {
    fontSize: 13,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  qtySection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  qty: {
    fontSize: 20,
    fontWeight: '800',
  },
  qtyDeduct: {
    color: COLORS.danger,
  },
  qtyRestock: {
    color: COLORS.success,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  loadMoreBtn: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loadMoreBtnDark: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  textLight: {
    color: '#f8fafc',
  },
  textDimmed: {
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '500',
  },
});
