import { useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

const PUBLIC_SEGMENTS = new Set(['index', 'login', 'register', 'welcome', 'forgot-password']);

/** Send unauthenticated users to /login before protected screens render. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    if (!root || PUBLIC_SEGMENTS.has(root)) return;
    if (!user && !isGuest) {
      router.replace('/login');
    }
  }, [loading, user, isGuest, segments, router]);

  return <>{children}</>;
}
