import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthLanding } from '@/components/AuthLanding';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

/** App entry — login and register landing page. */
export default function LoginScreen() {
  const router = useRouter();
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (user || isGuest) return <Redirect href="/(tabs)" />;

  return <AuthLanding onAuthed={() => router.replace('/(tabs)')} />;
}
