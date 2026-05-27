import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface PremiumCardProps {
  children: React.ReactNode;
  colors: any;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: number;
  gap?: number;
}

export function PremiumCard({
  children,
  colors,
  style,
  variant = 'outlined',
  padding = 16,
  gap = 12,
}: PremiumCardProps) {
  const variantStyles = {
    default: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    elevated: {
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    filled: {
      backgroundColor: colors.primary + '08',
      borderColor: colors.primary + '20',
      borderWidth: 1,
    },
  };

  return (
    <View
      style={[
        styles.card,
        {
          padding,
          gap,
        },
        variantStyles[variant],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
