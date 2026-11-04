import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useAssistantSummary } from '../../hooks/useApiData';

interface AssistantSummaryDto {
  readonly balanceCents: number;
  readonly incomeCents: number;
  readonly outcomeCents: number;
  readonly recent: readonly {
    readonly occurredAt: string;
    readonly type: string;
    readonly amountCents: number;
    readonly description: string | null;
  }[];
}

export default function Assistant01Screen() {
  const [summary, setSummary] = useState<AssistantSummaryDto | null>(null);
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    ;(async () => {
      const { data } = await useAssistantSummary(null, true);
      setSummary(data ?? null);
    })();
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {summary && (
        <View style={styles.summarySection}>
          <Text style={styles.balance}>Saldo: ${(summary.balanceCents / 100).toFixed(2)}</Text>
          <Text style={styles.income}>Ingreso: ${(summary.incomeCents / 100).toFixed(2)}</Text>
          <Text style={styles.outcome}>Egreso: ${(summary.outcomeCents / 100).toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.chatSection}>
        {chatHistory.length > 0 && (
          <View style={styles.chatArea}>
            {chatHistory.map((entry, index) => (
              <View
                key={index}
                style={entry.role === 'user' ? styles.userBubble : styles.assistantBubble}
              >
                <Text style={styles.bubbleText}>{entry.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Consulta al asistente..."
            value={message}
            onChangeText={setMessage}
            style={styles.input}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Text style={styles.sendText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F2F8' },
  summarySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF5',
  },
  balance: { fontSize: 18, fontWeight: 'bold', color: '#CB0067' },
  income: { fontSize: 16, color: '#00845B' },
  outcome: { fontSize: 16, color: '#D1493F' },
  chatSection: { flex: 1, padding: 20 },
  chatArea: { maxHeight: 200, marginBottom: 20 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FCE0EB' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#EBF8FF' },
  bubbleText: { padding: 8, fontSize: 14 },
  inputRow: { flexDirection: 'row', padding: 10 },
  input: { flex: 1, borderColor: '#E5E7EB', borderWidth: 1, padding: 8, borderRadius: 4 },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#CB0067',
    marginLeft: 8,
    borderRadius: 4,
  },
  sendText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
});