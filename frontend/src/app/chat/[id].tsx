import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatApi } from '@/api/services';
import { Message } from '@/api/types';
import { Field } from '@/components/Field';
import { useAuth } from '@/context/AuthContext';
import { colors, font, radius, spacing } from '@/theme';

export default function ChatThread() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const convoId = Number(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const data = await ChatApi.messages(convoId);
      setMessages(data);
    } catch {
      // keep existing
    }
  }, [convoId]);

  useEffect(() => {
    load();
    // Poll for new messages (MVP real-time via polling).
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      const msg = await ChatApi.send(convoId, text);
      setMessages((m) => [...m, msg]);
    } catch {
      setInput(text);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => {
            const mine = m.sender === user?.id;
            return (
              <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.text, mine && { color: colors.white }]}>{m.message}</Text>
                <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.7)' }]}>
                  {new Date(m.interaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Field placeholder={t('chat.typeMessage')} value={input} onChangeText={setInput} onSubmitEditing={send} />
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
  bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radius.lg },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { color: colors.text, fontSize: font.md },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sendBtn: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
