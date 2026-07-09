import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

/** Root URL — login if signed out, home if signed in. */
export default function Index() {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (user || isGuest) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}
