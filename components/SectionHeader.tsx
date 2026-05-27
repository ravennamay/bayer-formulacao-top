import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  colors: any;
  action?: React.ReactNode;
}

export function SectionHeader({ title, description, icon, colors, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {icon && (
          <Ionicons name={icon as any} size={20} color={colors.primary} style={styles.icon} />
        )}
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
          )}
        </View>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  icon: {
    width: 24,
    height: 24,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 12,
  },
});
