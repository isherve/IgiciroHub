import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { useAuth } from '@/context/AuthContext';
import { colors, font, spacing } from '@/theme';

const DEMO = { email: 'demo@igicirohub.rw', password: 'Demo1234!' };

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();

  const [role, setRole] = useState('cooperative');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (em: string, pw: string) => {
    setError('');
    setLoading(true);
    try {
      await login(em, pw);
      router.replace('/(tabs)');
    } catch (e) {
      setError(apiError(e, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text style={styles.title}>{t('auth.login')}</Text>

        <Segmented
          options={[
            { value: 'cooperative', label: t('auth.cooperative') },
            { value: 'buyer', label: t('auth.buyer') },
          ]}
          value={role}
          onChange={setRole}
        />

        <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title={t('auth.login')} onPress={() => doLogin(email, password)} loading={loading} />

        <View style={styles.links}>
          <Text style={styles.link} onPress={() => router.push('/forgot-password')}>{t('auth.forgot')}</Text>
          <Text style={styles.link} onPress={() => router.push('/register')}>{t('auth.noAccount')}</Text>
        </View>

        <View style={styles.divider} />

        <Button title={t('auth.demoLogin')} variant="accent" onPress={() => doLogin(DEMO.email, DEMO.password)} loading={loading} />
        <Button title={t('auth.guest')} variant="ghost" onPress={async () => { await continueAsGuest(); router.replace('/(tabs)'); }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: font.sm },
  links: { gap: spacing.sm, alignItems: 'center', marginVertical: spacing.sm },
  link: { color: colors.primary, fontSize: font.sm, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
