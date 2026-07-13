import { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, withAlpha, useResponsive } from '@/theme';
import { Text } from './Text';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;

  /** Standardized screen header. */
  title?: string;
  subtitle?: string;
  /** Trailing header slot (e.g. a status pill). */
  headerRight?: ReactNode;
  /** Accent for the title glow / tick. */
  accent?: string;

  /**
   * Docked bottom action area — stays in the thumb zone above the tab bar and
   * never scrolls away. Use for the screen's primary action(s).
   */
  footer?: ReactNode;
  /** Avoid the keyboard (for screens with inputs). */
  avoidKeyboard?: boolean;
}

/**
 * Base screen wrapper: Solo Leveling void-black background with a subtle
 * ambient blue glow at top, safe areas, an optional system-styled header,
 * scrolling, and a docked footer for primary actions.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  contentStyle,
  refreshing,
  onRefresh,
  title,
  subtitle,
  headerRight,
  accent = colors.systemBlue,
  footer,
  avoidKeyboard,
}: ScreenProps) {
  const { gutter } = useResponsive();
  const pad = padded ? gutter : 0;

  const header = title ? (
    <View style={[styles.header, { paddingHorizontal: pad }]}>
      <View style={styles.headerText}>
        <Text
          variant="title"
          color={colors.text}
          glowColor={withAlpha(accent, 0.45)}
          numberOfLines={1}
          brackets
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textDim} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
    </View>
  ) : null;

  const inner: ViewStyle = {
    paddingHorizontal: pad,
    paddingTop: title ? spacing.sm : pad,
    // Leave room so the last item clears the docked footer.
    paddingBottom: footer ? spacing['2xl'] : spacing.xl,
    flexGrow: 1,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[inner, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.systemBlue}
            colors={[colors.systemBlue]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, contentStyle]}>{children}</View>
  );

  const content = (
    <>
      {/* Ambient glow at top — Solo Leveling system aura */}
      <LinearGradient
        colors={[withAlpha(colors.systemBlue, 0.06), 'transparent']}
        style={styles.ambientGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      {header}
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingHorizontal: pad }]}>{footer}</View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    zIndex: 1,
  },
  headerText: { flex: 1, gap: 3 },
  subtitle: { marginTop: 1 },
  headerRight: { flexShrink: 0 },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: withAlpha(colors.systemBlue, 0.2),
    backgroundColor: withAlpha(colors.bgSecondary, 0.95),
    gap: spacing.sm,
  },
});
