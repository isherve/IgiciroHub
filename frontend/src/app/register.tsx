import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';

import { apiError } from '@/api/api';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { useAuth } from '@/context/AuthContext';
import { colors, font, spacing } from '@/theme';

export default function Register() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { register } = useAuth();

  const [role, setRole] = useState(params.role === 'buyer' ? 'buyer' : 'cooperative');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [coopName, setCoopName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email.';
    if (phone.replace(/\D/g, '').length < 9) e.phone = 'Enter a valid phone number.';
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (role === 'cooperative' && coopName.trim().length < 2) e.coopName = 'Enter the cooperative name.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setServerError('');
    if (!validate()) return;
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
      router.replace('/(tabs)');
    } catch (err) {
      setServerError(apiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text style={styles.title}>{t('auth.register')}</Text>

        <Segmented
          label={t('auth.registerAs')}
          options={[
            { value: 'cooperative', label: t('auth.cooperative') },
            { value: 'buyer', label: t('auth.buyer') },
          ]}
          value={role}
          onChange={setRole}
        />

        <Field label={t('auth.fullName')} value={fullName} onChangeText={setFullName} error={errors.fullName} />
        <Field label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} placeholder="+2507..." />
        <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={errors.email} />

        {role === 'cooperative' ? (
          <>
            <Field label={t('auth.coopName')} value={coopName} onChangeText={setCoopName} error={errors.coopName} />
            <Field label={t('auth.location')} value={location} onChangeText={setLocation} />
          </>
        ) : (
          <Field label={t('auth.businessName')} value={businessName} onChangeText={setBusinessName} />
        )}

        <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry error={errors.password} />

        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

        <Button title={t('auth.register')} onPress={submit} loading={loading} />
        <Text style={styles.link} onPress={() => router.push('/login')}>{t('auth.haveAccount')}</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: font.sm },
  link: { color: colors.primary, fontSize: font.sm, fontWeight: '600', textAlign: 'center', marginTop: spacing.sm },
});
