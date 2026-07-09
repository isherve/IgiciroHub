import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { useAuth } from '@/context/AuthContext';
import { colors, font, radius, spacing } from '@/theme';

const DEMO = { email: 'demo@igicirohub.rw', password: 'Demo1234!' };

type AuthMode = 'login' | 'register';

export function AuthLanding() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ auth?: string; role?: string }>();
  const { login, register, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<AuthMode>(params.auth === 'register' ? 'register' : 'login');
  const [role, setRole] = useState(params.role === 'buyer' ? 'buyer' : 'cooperative');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [coopName, setCoopName] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const doLogin = async (em: string, pw: string) => {
    setError('');
    setLoading(true);
    try {
      await login(em, pw);
    } catch (e) {
      setError(apiError(e, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email.';
    if (phone.replace(/\D/g, '').length < 9) e.phone = 'Enter a valid phone number.';
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (role === 'cooperative' && coopName.trim().length < 2) e.coopName = 'Enter the cooperative name.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const doRegister = async () => {
    setError('');
    if (!validateRegister()) return;
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone.trim(),
        password,
        role,
        location,
        cooperative_name: coopName,
        business_name: businessName,
      });
    } catch (err) {
      setError(apiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const continueGuest = async () => {
    setLoading(true);
    try {
      await continueAsGuest();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="cafe" size={44} color={colors.primary} />
          </View>
          <Text style={styles.brand}>{t('app.name')}</Text>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>

        <Segmented
          options={[
            { value: 'login', label: t('auth.login') },
            { value: 'register', label: t('auth.register') },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v as AuthMode);
            setError('');
            setFieldErrors({});
          }}
        />

        <Segmented
          options={[
            { value: 'cooperative', label: t('auth.cooperative') },
            { value: 'buyer', label: t('auth.buyer') },
          ]}
          value={role}
          onChange={setRole}
        />

        {mode === 'login' ? (
          <>
            <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
            <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={t('auth.login')} onPress={() => doLogin(email, password)} loading={loading} />
            <Text style={styles.link} onPress={() => router.push('/forgot-password')}>{t('auth.forgot')}</Text>
            <Text style={styles.link} onPress={() => setMode('register')}>{t('auth.noAccount')}</Text>
            <View style={styles.divider} />
            <Button title={t('auth.demoLogin')} variant="accent" onPress={() => doLogin(DEMO.email, DEMO.password)} loading={loading} />
          </>
        ) : (
          <>
            <Field label={t('auth.fullName')} value={fullName} onChangeText={setFullName} error={fieldErrors.fullName} />
            <Field label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fieldErrors.phone} placeholder="+2507..." />
            <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={fieldErrors.email} />
            {role === 'cooperative' ? (
              <>
                <Field label={t('auth.coopName')} value={coopName} onChangeText={setCoopName} error={fieldErrors.coopName} />
                <Field label={t('auth.location')} value={location} onChangeText={setLocation} />
              </>
            ) : (
              <Field label={t('auth.businessName')} value={businessName} onChangeText={setBusinessName} />
            )}
            <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry error={fieldErrors.password} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={t('auth.register')} onPress={doRegister} loading={loading} />
            <Text style={styles.link} onPress={() => setMode('login')}>{t('auth.haveAccount')}</Text>
          </>
        )}

        <Button title={t('auth.guest')} variant="ghost" onPress={continueGuest} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  brand: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  tagline: { color: colors.primary, fontSize: font.md, fontWeight: '600', textAlign: 'center' },
  error: { color: colors.danger, fontSize: font.sm },
  link: { color: colors.primary, fontSize: font.sm, fontWeight: '600', textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
