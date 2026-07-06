import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthApi } from '@/api/services';
import { apiError } from '@/api/api';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { colors, font, spacing } from '@/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const r = await AuthApi.requestReset(email.trim().toLowerCase());
      setMessage(r.data?.detail ?? 'If that email exists, a reset link has been sent.');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.info}>
        Enter your email and we&apos;ll send you a password reset link.
      </Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Send reset link" onPress={submit} loading={loading} />
      <Button title="Back to login" variant="ghost" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { color: colors.textMuted, fontSize: font.md },
  success: { color: colors.success, fontSize: font.sm },
  error: { color: colors.danger, fontSize: font.sm },
  spacer: { height: spacing.sm },
});
