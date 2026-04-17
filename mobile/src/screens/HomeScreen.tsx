import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { triggerManual } from '../services/BackgroundScheduler';

export default function HomeScreen(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function onTrigger(): Promise<void> {
    setLoading(true);
    try {
      await triggerManual();
      setLastResult('Done — check notification for result');
    } catch (e) {
      Alert.alert('Trigger failed', String(e));
      setLastResult(`Error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Smart Attendance</Text>
        <Text style={styles.subtitle}>Zero-Touch Auto Check-In</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Trạng thái</Text>
          <Text style={styles.cardValue}>Đang chạy nền</Text>
          <Text style={styles.cardFoot}>
            App tự động xác minh vị trí khi đến chi nhánh và chấm công không cần chạm.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onTrigger}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Kiểm tra ngay</Text>
          )}
        </TouchableOpacity>

        {lastResult && (
          <Text style={styles.result}>{lastResult}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f7f9' },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111' },
  subtitle: { marginTop: 4, color: '#49B7C3', fontWeight: '600' },
  card: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase' },
  cardValue: { marginTop: 6, fontSize: 20, fontWeight: '700', color: '#111' },
  cardFoot: { marginTop: 8, fontSize: 13, color: '#6b7280', lineHeight: 20 },
  button: {
    marginTop: 28,
    backgroundColor: '#49B7C3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  result: { marginTop: 16, color: '#6b7280', fontSize: 13, textAlign: 'center' },
});
