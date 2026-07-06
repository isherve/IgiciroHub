import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** When true, guests may access (browse-only screens). */
  allowGuest?: boolean;
};

/** Redirect unauthenticated users away from protected screens. */
export function RequireAuth({ children, allowGuest = false }: Props) {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user && !allowGuest) return <Redirect href="/" />;
  if (isGuest && !allowGuest) return <Redirect href="/" />;

  return <>{children}</>;
}
