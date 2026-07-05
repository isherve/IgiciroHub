import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoffeeBackdrop } from '@/components/CoffeeBackground';
import { colors, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  coffeeBg?: boolean;
};

export function Screen({ children, scroll = true, padded = true, style, refreshControl, coffeeBg = true }: Props) {
  const inner = padded ? styles.padded : undefined;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[inner, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {coffeeBg ? <CoffeeBackdrop /> : null}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});
