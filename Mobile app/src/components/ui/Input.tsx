import { forwardRef, useState } from 'react';
import { View, StyleSheet, TextInput, TextInputProps, Pressable, ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Text } from './Text';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Small helper / error text under the field. */
  hint?: string;
  error?: boolean;
  secure?: boolean;
  /** Leading icon (e.g. a lucide glyph). */
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Standardized labeled text field. Clear placeholder styling, a visible focus
 * ring, an optional password reveal, and inline hint/error text.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, secure, icon, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  const borderColor = error
    ? colors.crimson
    : focused
      ? colors.energyBright
      : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text variant="caption" color={focused ? colors.energyBright : colors.textDim}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: focused ? colors.surface2 : colors.surface,
          },
          focused && { shadowColor: colors.energy, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          selectionColor={colors.energyBright}
          maxFontSizeMultiplier={1.2}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.reveal}>
            {hidden ? (
              <EyeOff size={18} color={colors.textDim} />
            ) : (
              <Eye size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text variant="caption" color={error ? colors.crimson : colors.textDim}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    minHeight: 52,
  },
  icon: { marginRight: 2 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.md,
    // Ensure touch events are always received on Android
    ...(require('react-native').Platform.OS === 'android' ? { textAlignVertical: 'center' } : {}),
  },
  reveal: { padding: 4 },
});
