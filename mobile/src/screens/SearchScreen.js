// SearchScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getItems } from '../api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commonStyles, COLORS, SPACING, BORDER_RADIUS } from '../styles/common';

const PAGE_SIZE = 10;
const CACHE_ITEMS_KEY = 'search_cached_items';

// Deep equality helper
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

// Cache helpers
const loadFromCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_ITEMS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToCache = async (data) => {
  try {
    await AsyncStorage.setItem(CACHE_ITEMS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache items', e);
  }
};

export default function SearchScreen({ navigation, route }) {
  const { employeeId, employeeName } = route.params || {};
  const [query, setQuery] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const startFadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // Background refresh
  const backgroundRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    
    try {
      const items = await getItems();
      const safeItems = Array.isArray(items) ? items : [];
      
      if (!deepEqual(allItems, safeItems)) {
        setAllItems(safeItems);
        await saveToCache(safeItems);
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [allItems, loading, refreshing]);

  // Manual pull-to-refresh (user-triggered)
  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      const items = await getItems();
      const safeItems = Array.isArray(items) ? items : [];
      
      setAllItems(safeItems);
      await saveToCache(safeItems);
    } catch (error) {
      console.error('Pull refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  const loadItems = useCallback(async () => {
    setLoading(true);
    const cached = await loadFromCache();
    
    if (Array.isArray(cached)) {
      setAllItems(cached);
      setFiltered(cached);
      setPage(1);
      setLoading(false);
      startFadeIn();
    }
    
    try {
      const items = await getItems();
      const safeItems = Array.isArray(items) ? items : [];
      
      if (!deepEqual(cached, safeItems)) {
        setAllItems(safeItems);
        await saveToCache(safeItems);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
      if (!cached) startFadeIn();
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Auto background refresh every 30s
  useEffect(() => {
    const interval = setInterval(backgroundRefresh, 30000);
    return () => clearInterval(interval);
  }, [backgroundRefresh]);

  // Search + filter
  useEffect(() => {
    const lower = query.toLowerCase();
    const result = allItems.filter(
      item =>
        (item.name || '').toLowerCase().includes(lower) ||
        (item.category || '').toLowerCase().includes(lower)
    );
    setFiltered(result);
    setPage(1);
  }, [query, allItems]);

  // Pagination
  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const handleLoadMore = () => {
    if (paginated.length < filtered.length) {
      setPage(p => p + 1);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Item renderer with inline card
  const renderItem = ({ item }) => {
    const isOutOfStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={[commonStyles.card, isDarkMode && commonStyles.cardDark, styles.itemCard]}
        onPress={() => navigation.navigate('Deduct', { 
          preselectedItem: item, 
          employeeId, 
          employeeName 
        })}
        activeOpacity={0.8}
        disabled={isOutOfStock}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemLeft}>
            <View style={[styles.itemIcon, { backgroundColor: isOutOfStock ? COLORS.text.secondary : COLORS.primary }]}>
              <Ionicons name="cube-outline" size={24} color={COLORS.text.light} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, isDarkMode && commonStyles.textDark]}>
                {item.name}
              </Text>
              <Text style={[styles.itemCategory, isDarkMode && commonStyles.textSecondaryDark]}>
                {item.category || 'Uncategorized'}
              </Text>
            </View>
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.itemStock, isOutOfStock && styles.outOfStock]}>
              {item.stock}
            </Text>
          </View>
        </View>
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Loading UI
  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.safeArea, isDarkMode && commonStyles.safeAreaDark]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={50} color={COLORS.primary} />
          <Text style={[styles.loadingText, isDarkMode && commonStyles.textSecondaryDark]}>
            Loading items…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.safeArea, isDarkMode && commonStyles.safeAreaDark]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <ScrollView style={commonStyles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={isDarkMode ? COLORS.text.dark : COLORS.text.primary} />
                  </TouchableOpacity>
                  <View>
                    <Text style={[styles.title, isDarkMode && commonStyles.titleDark]}>
                      Search Items
                    </Text>
                    <Text style={[styles.subtitle, isDarkMode && commonStyles.subtitleDark]}>
                      Find items to deduct
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                  <Ionicons
                    name={isDarkMode ? 'sunny' : 'moon'}
                    size={24}
                    color={isDarkMode ? COLORS.text.dark : COLORS.text.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Refreshing Badge */}
              {refreshing && !loading && (
                <View style={[commonStyles.badge, styles.refreshBadge]}>
                  <ActivityIndicator size="small" color={COLORS.text.light} />
                  <Text style={commonStyles.badgeText}>Updating…</Text>
                </View>
              )}

              {/* Search */}
              <View style={[commonStyles.input, isDarkMode && commonStyles.inputDark, styles.searchBox]}>
                <Ionicons name="search" size={20} color={isDarkMode ? COLORS.text.tertiary : COLORS.text.secondary} />
                <TextInput
                  placeholder="Search items by name or category..."
                  placeholderTextColor={isDarkMode ? COLORS.text.tertiary : COLORS.text.secondary}
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                />
              </View>

              {/* Stats */}
              {filtered.length > 0 && (
                <View style={[commonStyles.card, isDarkMode && commonStyles.cardDark, styles.statsCard]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, isDarkMode && commonStyles.textSecondaryDark]}>Results</Text>
                    <Text style={[styles.statValue, isDarkMode && commonStyles.textDark]}>{filtered.length}</Text>
                  </View>
                  <View style={[styles.statDivider, isDarkMode && commonStyles.dividerDark]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, isDarkMode && commonStyles.textSecondaryDark]}>Page</Text>
                    <Text style={[styles.statValue, isDarkMode && commonStyles.textDark]}>{page}</Text>
                  </View>
                </View>
              )}

              {/* Items List */}
              <FlatList
                ref={flatListRef}
                data={paginated}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                style={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onPullRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                    progressBackgroundColor={isDarkMode ? COLORS.card.dark : COLORS.card.light}
                  />
                }
                ListEmptyComponent={
                  <View style={commonStyles.emptyState}>
                    <Ionicons name="search" size={60} color={COLORS.text.secondary} />
                    <Text style={[commonStyles.emptyStateText, isDarkMode && commonStyles.emptyStateTextDark]}>
                      No items found
                    </Text>
                    {query.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearSearchBtn}
                        onPress={() => setQuery('')}
                      >
                        <Text style={[styles.clearSearchText, isDarkMode && commonStyles.textDark]}>
                          Clear search
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                }
              />

              {/* Load More Button */}
              {page * PAGE_SIZE < filtered.length && (
                <TouchableOpacity 
                  style={[styles.loadMoreBtn, isDarkMode && styles.loadMoreBtnDark]} 
                  onPress={handleLoadMore}
                >
                  <Text style={[styles.loadMoreText, isDarkMode && commonStyles.textDark]}>
                    Load More ({filtered.length - page * PAGE_SIZE} remaining)
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBadge: {
    marginBottom: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border.light,
    height: 40,
  },
  list: {
    flex: 1,
  },
  itemCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 13,
  },
  itemRight: {
    alignItems: 'center',
  },
  itemStock: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  outOfStock: {
    color: COLORS.text.secondary,
    backgroundColor: 'transparent',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  outOfStockText: {
    color: COLORS.text.light,
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  clearSearchBtn: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadMoreBtn: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card.light,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  loadMoreBtnDark: {
    backgroundColor: COLORS.card.dark,
    borderColor: COLORS.border.dark,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
