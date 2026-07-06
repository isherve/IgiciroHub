import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/permissions';
import { colors } from '@/theme';

/** Admin-only screens (platform analytics, ML internals). */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user || isGuest || !isAdmin(user)) return <Redirect href="/(tabs)" />;

  return <>{children}</>;
}
