import { useSegments } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Redirect, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

const PUBLIC_SEGMENTS = new Set(['index', 'login', 'register', 'welcome', 'forgot-password']);

/** Block protected routes until the user is signed in or browsing as guest. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const segments = useSegments();
  const root = segments[0];
  const isPublic = !root || PUBLIC_SEGMENTS.has(root);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isPublic && !user && !isGuest) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}
