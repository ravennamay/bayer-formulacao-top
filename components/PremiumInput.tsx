import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface PremiumInputProps extends TextInputProps {
  colors: any;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  error?: string;
  isPassword?: boolean;
  strength?: 'weak' | 'medium' | 'strong';
}

export function PremiumInput({
  colors,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  isPassword = false,
  strength,
  ...props
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getStrengthColor = () => {
    if (!strength) return colors.textTertiary;
    if (strength === 'weak') return colors.danger;
    if (strength === 'medium') return colors.warning;
    return colors.success;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border,
          },
        ]}
      >
        {icon && <Ionicons name={icon as any} size={18} color={colors.textSecondary} />}

        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.textInput,
            {
              color: colors.textPrimary,
            },
          ]}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon as any} size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {strength && (
        <View style={styles.strengthContainer}>
          <View
            style={[
              styles.strengthBar,
              {
                backgroundColor: getStrengthColor(),
                width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%',
              },
            ]}
          />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  strengthContainer: {
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
