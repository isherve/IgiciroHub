import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatApi } from '@/api/services';
import { Conversation, Message } from '@/api/types';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { colors, font, radius, spacing } from '@/theme';

export default function ChatThread() {
  return (
    <RequireAuth>
      <ChatThreadScreen />
    </RequireAuth>
  );
}

function ChatThreadScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, seller, about, price } = useLocalSearchParams<{
    id: string;
    seller?: string;
    about?: string;
    price?: string;
  }>();
  const { user } = useAuth();
  const convoId = Number(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const otherName = seller ?? (user?.role === 'cooperative' ? convo?.buyer_name : convo?.cooperative_name) ?? 'Seller';
  const aboutLine = about ? `About: ${about}${price ? ` · ${price}` : ''}` : null;

  const load = useCallback(async () => {
    try {
      const [data, all] = await Promise.all([
        ChatApi.messages(convoId),
        ChatApi.conversations(),
      ]);
      setMessages(data);
      setConvo(all.results?.find((c) => c.id === convoId) ?? null);
    } catch {
      // keep existing
    }
  }, [convoId]);

  useEffect(() => {
    load();
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{otherName[0]?.toUpperCase() ?? 'S'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topName}>{otherName}</Text>
          {aboutLine ? <Text style={styles.topAbout} numberOfLines={1}>{aboutLine}</Text> : null}
        </View>
      </View>

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
                <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>
                  {new Date(m.interaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
          />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: spacing.xs },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: font.lg },
  topName: { color: colors.text, fontSize: font.md, fontWeight: '800' },
  topAbout: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.lg },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  text: { color: colors.text, fontSize: font.md, lineHeight: 22 },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 6, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: font.md,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
