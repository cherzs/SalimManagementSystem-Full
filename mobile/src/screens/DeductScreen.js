import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getItems, deductItem } from '../api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../styles/common';

const CACHE_ITEMS_KEY = 'deduct_cached_items';

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

export default function DeductScreen({ route, navigation }) {
  const { isDarkMode, toggleTheme, employeeId, employeeName, setHasDeducted } = useApp();
  const { preselectedItem } = route.params || {};
  const [allItems, setAllItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(preselectedItem ? [{ item: preselectedItem, qty: '' }] : []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deducting, setDeducting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const flatListRef = useRef(null);

  const startFadeIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (preselectedItem) {
      setSelected([{ item: preselectedItem, qty: '' }]);
      navigation.setParams({ preselectedItem: undefined });
    }
  }, [route.params?.preselectedItem]);

  const backgroundRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      const data = await getItems();
      const safeData = Array.isArray(data) ? data : [];
      if (!deepEqual(allItems, safeData)) {
        setAllItems(safeData);
        await saveToCache(safeData);
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [allItems, loading, refreshing]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getItems();
      const safeData = Array.isArray(data) ? data : [];
      setAllItems(safeData);
      await saveToCache(safeData);
    } catch (error) {
      Alert.alert("Error", "Failed to refresh items");
    } finally {
      setRefreshing(false);
    }
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    const cached = await loadFromCache();
    if (Array.isArray(cached)) {
      setAllItems(cached);
      setFiltered(cached);
      setLoading(false);
      startFadeIn();
    }
    try {
      const data = await getItems();
      const safeData = Array.isArray(data) ? data : [];
      if (!deepEqual(cached, safeData)) {
        setAllItems(safeData);
        await saveToCache(safeData);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load items");
    } finally {
      setLoading(false);
      if (!cached) startFadeIn();
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const interval = setInterval(backgroundRefresh, 30000);
    return () => clearInterval(interval);
  }, [backgroundRefresh]);

  useEffect(() => {
    const lower = search.toLowerCase();
    const result = allItems.filter(
      item =>
        (item.name || '').toLowerCase().includes(lower) ||
        (item.category || '').toLowerCase().includes(lower)
    );
    setFiltered(result);
  }, [search, allItems]);

  const handleAddItem = (item) => {
    if (selected.find(sel => sel.item.id === item.id)) return;
    setSelected(prev => [...prev, { item, qty: '' }]);
  };

  const handleQtyChange = (idx, qty) => {
    setSelected(prev => prev.map((sel, i) => i === idx ? { ...sel, qty } : sel));
  };

  const handleRemove = (idx) => {
    setSelected(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDeduct = async () => {
    if (selected.length === 0) {
      Alert.alert("Error", "Add at least one item");
      return;
    }
    for (const sel of selected) {
      if (!sel.item?.id) {
        Alert.alert("Error", "Invalid item selected");
        return;
      }
      if (!sel.qty || isNaN(sel.qty) || Number(sel.qty) <= 0) {
        Alert.alert("Error", `Invalid quantity for ${sel.item.name}`);
        return;
      }
    }
    setDeducting(true);
    try {
      await deductItem({
        employeeId,
        employeeName,
        items: selected.map(sel => ({
          itemId: sel.item.id,
          qty: parseInt(sel.qty),
        })),
      });
      await saveToCache([]);
      setHasDeducted(true);
      setSelected([]);
      Alert.alert("Success", "Items deducted successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Deduction failed");
    } finally {
      setDeducting(false);
    }
  };

  const renderSelectedItem = ({ item, index }) => (
    <View style={[styles.selectedCard, isDarkMode && styles.selectedCardDark]}>
      <View style={styles.selectedItemIconWrap}>
        <Ionicons name="cube" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.selectedItemDetails}>
        <Text style={[styles.selectedItemName, isDarkMode && styles.textLight]} numberOfLines={1}>
          {item.item.name}
        </Text>
        <Text style={[styles.selectedItemStock, isDarkMode && styles.textDimmed]}>
          In Stock: {item.item.stock}
        </Text>
      </View>
      
      <View style={styles.qtyActionArea}>
        <View style={[styles.qtyInputBox, isDarkMode && styles.qtyInputBoxDark, (!item.qty || item.qty === '0') && { borderColor: COLORS.danger }]}>
          <TextInput
            placeholder="0"
            placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'}
            value={item.qty}
            onChangeText={qty => handleQtyChange(index, qty)}
            keyboardType="numeric"
            style={[styles.qtyInput, isDarkMode && styles.textLight]}
            selectionColor={COLORS.primary}
          />
        </View>
        <TouchableOpacity onPress={() => handleRemove(index)} style={styles.removeBtn} activeOpacity={0.6}>
          <Ionicons name="close-circle" size={26} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isSelected = selected.some(sel => sel.item.id === item.id);
    const isOutOfStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          isDarkMode && styles.itemCardDark,
          isSelected && styles.itemCardSelected,
          isOutOfStock && styles.itemCardDisabled,
        ]}
        onPress={() => handleAddItem(item)}
        activeOpacity={0.8}
        disabled={isOutOfStock || isSelected}
      >
        <View style={styles.itemCardContent}>
          <View style={[styles.itemIcon, { backgroundColor: isOutOfStock ? '#cbd5e1' : isSelected ? COLORS.success : `${COLORS.primary}15` }]}>
            {isSelected ? (
              <Ionicons name="checkmark" size={22} color="#ffffff" />
            ) : (
              <Ionicons name="cube-outline" size={22} color={isOutOfStock ? '#ffffff' : COLORS.primary} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, isDarkMode && styles.textLight, isOutOfStock && styles.textDimmed]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.itemCategory, isDarkMode && styles.textDimmed]}>
              {item.category || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.itemRight}>
            <View style={[styles.stockBadge, isOutOfStock && { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.itemStock, isOutOfStock && { color: '#94a3b8' }]}>
                {item.stock}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.textLight]}>
            Deduct Items
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.textDimmed]}>
            Select items from inventory
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
          <Text style={styles.refreshBadgeText}>Updating catalog...</Text>
        </View>
      )}

      {/* Modern Search Box */}
      <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
        <Ionicons name="search" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        <TextInput
          placeholder="Search items by name or category..."
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, isDarkMode && styles.textLight]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={20} color={isDarkMode ? '#475569' : '#cbd5e1'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Items Cluster */}
      {selected.length > 0 && (
        <View style={styles.selectedSection}>
          <View style={styles.selectedSectionHeader}>
            <View style={styles.selectedTitleRow}>
              <Ionicons name="cart" size={20} color={COLORS.primary} />
              <Text style={[styles.selectedTitle, isDarkMode && styles.textLight]}>
                Ready to Deduct ({selected.length})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelected([])} style={styles.clearBtn} activeOpacity={0.6}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={selected}
            renderItem={renderSelectedItem}
            keyExtractor={(item, index) => 'sel-' + index.toString()}
            scrollEnabled={false}
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
        Catalog
      </Text>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.rootContainer, isDarkMode && styles.rootContainerDark]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={40} color={COLORS.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.textDimmed]}>
            Loading inventory...
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
            
            <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={filtered}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={[styles.listContent, { paddingBottom: selected.length > 0 ? 120 : 40 }]}
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
                    <Ionicons name="cube-outline" size={60} color={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <Text style={[styles.emptyStateText, isDarkMode && styles.textDimmed]}>
                      {search ? 'No items match your search.' : 'Inventory is empty.'}
                    </Text>
                  </View>
                }
              />
            </Animated.View>

            {/* Floating Action Button */}
            {selected.length > 0 && (
              <Animated.View style={styles.floatingBtnContainer}>
                <TouchableOpacity
                  style={[styles.floatingDeductBtn, deducting && { opacity: 0.7 }]}
                  onPress={handleDeduct}
                  disabled={deducting}
                  activeOpacity={0.85}
                >
                  {deducting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.floatingDeductText}>
                        Checkout {selected.length} Item{selected.length > 1 ? 's' : ''}
                      </Text>
                      <Ionicons name="arrow-forward-circle" size={24} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    marginTop: 8,
  },
  selectedSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  selectedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  selectedCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  selectedItemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedItemDetails: {
    flex: 1,
    marginRight: 8,
  },
  selectedItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  selectedItemStock: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  qtyActionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyInputBox: {
    width: 60,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
  },
  qtyInputBoxDark: {
    backgroundColor: '#0f172a',
    borderColor: '#475569',
  },
  qtyInput: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  removeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
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
  itemCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#334155',
  },
  itemCardSelected: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  itemCardDisabled: {
    opacity: 0.6,
  },
  itemCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  stockBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemStock: {
    fontSize: 16,
    fontWeight: '800',
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
  floatingBtnContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  floatingDeductBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingDeductText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
});
