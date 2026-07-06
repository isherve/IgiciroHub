import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { canManageListings } from '@/lib/permissions';
import { colors } from '@/theme';

/** Cooperative-only screens (manage profile and marketplace listings). */
export function RequireCooperative({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!canManageListings(user, isGuest)) return <Redirect href="/(tabs)" />;

  return <>{children}</>;
}
