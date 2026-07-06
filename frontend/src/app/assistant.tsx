import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiError } from '@/api/api';
import { AssistantApi } from '@/api/services';
import { CoffeeBackdrop } from '@/components/CoffeeBackground';
import { Field } from '@/components/Field';
import { RequireAuth } from '@/components/RequireAuth';
import { colors, font, radius, spacing } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type Msg = { role: 'user' | 'ai'; text: string };

export default function Assistant() {
  return (
    <RequireAuth>
      <AssistantScreen />
    </RequireAuth>
  );
}

function AssistantScreen() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: 'Muraho! Ask me about coffee farming, quality, or prices.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'gemini' | 'quota' | 'offline' | null>(null);

  useEffect(() => {
    AssistantApi.status()
      .then((s) => {
        if (s.available) setMode('gemini');
        else if (s.mode === 'quota') setMode('quota');
        else setMode('offline');
      })
      .catch(() => setMode('offline'));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const r = await AssistantApi.chat(text, i18n.language);
      if (r.source === 'gemini') setMode('gemini');
      setMessages((m) => [...m, { role: 'ai', text: r.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'ai', text: apiError(err, t('common.error')) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <CoffeeBackdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.list}>
          {mode !== null && (
            <View
              style={[
                styles.modeBadge,
                mode === 'gemini' ? styles.modeLive : mode === 'quota' ? styles.modeQuota : styles.modeStub,
              ]}
            >
              <Ionicons
                name={mode === 'gemini' ? 'sparkles' : mode === 'quota' ? 'warning' : 'leaf'}
                size={14}
                color={mode === 'gemini' ? colors.accent : mode === 'quota' ? colors.warning : colors.primary}
              />
              <Text style={styles.modeText}>
                {mode === 'gemini'
                  ? t('assistant.geminiLive')
                  : mode === 'quota'
                    ? t('assistant.geminiQuota')
                    : t('assistant.geminiOffline')}
              </Text>
            </View>
          )}
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.ai]}>
              <Text style={[styles.text, m.role === 'user' && { color: colors.white }]}>{m.text}</Text>
            </View>
          ))}
          {loading ? <Text style={styles.typing}>…</Text> : null}
        </ScrollView>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Field placeholder={t('assistant.placeholder')} value={input} onChangeText={setInput} onSubmitEditing={send} />
          </View>
          <Pressable style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modeLive: { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: colors.accent },
  modeQuota: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: colors.warning },
  modeStub: { backgroundColor: 'rgba(31,174,75,0.12)', borderColor: colors.primary },
  modeText: { color: colors.textMuted, fontSize: font.xs, fontWeight: '600' },
  bubble: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.lg },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  ai: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { color: colors.text, fontSize: font.md, lineHeight: 21 },
  typing: { color: colors.textMuted, paddingLeft: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sendBtn: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
