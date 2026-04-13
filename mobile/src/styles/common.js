// Shared styles for mobile app
import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  background: {
    light: '#f3f4f6',
    dark: '#111827',
  },
  card: {
    light: '#ffffff',
    dark: '#1f2937',
  },
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    light: '#ffffff',
    dark: '#f9fafb',
  },
  border: {
    light: '#e5e7eb',
    dark: '#374151',
  },
  shadow: '#000000',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },
  safeAreaDark: {
    backgroundColor: COLORS.background.dark,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card.light,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: SPACING.md,
  },
  cardDark: {
    backgroundColor: COLORS.card.dark,
    borderColor: COLORS.border.dark,
    borderWidth: 1,
  },
  input: {
    backgroundColor: COLORS.card.light,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    color: COLORS.text.primary,
    fontSize: 16,
  },
  inputDark: {
    backgroundColor: COLORS.card.dark,
    borderColor: COLORS.border.dark,
    color: COLORS.text.dark,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDark: {
    backgroundColor: '#818cf8',
  },
  buttonText: {
    color: COLORS.text.light,
    fontWeight: '600',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  titleDark: {
    color: COLORS.text.dark,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  subtitleDark: {
    color: COLORS.text.tertiary,
  },
  text: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  textDark: {
    color: COLORS.text.dark,
  },
  textSecondary: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  textSecondaryDark: {
    color: COLORS.text.tertiary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: COLORS.text.light,
    fontSize: 12,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  emptyStateTextDark: {
    color: COLORS.text.tertiary,
  },
});

export { commonStyles, COLORS, SPACING, BORDER_RADIUS };
