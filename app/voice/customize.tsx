import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Button, Card, SectionHeader } from "@/components/ui";

interface VoiceSettings {
  pitch: number;
  speed: number;
  tone: number;
  volume: number;
  pauseBetweenSentences: number;
  pauseBetweenParagraphs: number;
}

interface PronunciationEntry {
  id: string;
  word: string;
  phonetic: string;
}

export default function VoiceCustomizationScreen() {
  const router = useRouter();
  const { voiceId } = useLocalSearchParams<{ voiceId: string }>();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [voiceName, setVoiceName] = useState("");
  const [settings, setSettings] = useState<VoiceSettings>({
    pitch: 1.0,
    speed: 1.0,
    tone: 0.5,
    volume: 0.8,
    pauseBetweenSentences: 300,
    pauseBetweenParagraphs: 800,
  });
  const [pronunciations, setPronunciations] = useState<PronunciationEntry[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newPhonetic, setNewPhonetic] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVoice();
    loadPronunciations();
  }, [voiceId]);

  const loadVoice = async () => {
    if (!voiceId) return;
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM voices WHERE id = ?",
      [voiceId]
    );
    if (result) setVoiceName(result.name);
  };

  const loadPronunciations = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ id: string; word: string; phonetic: string }>(
      "SELECT id, word, phonetic FROM pronunciation_dictionary ORDER BY word"
    );
    setPronunciations(result as PronunciationEntry[]);
  };

  const addPronunciation = async () => {
    if (!newWord.trim() || !newPhonetic.trim()) {
      Alert.alert("Error", "Both word and phonetic spelling are required");
      return;
    }
    const db = await getDatabase();
    const id = `pron_${Date.now()}`;
    await db.runAsync(
      "INSERT INTO pronunciation_dictionary (id, user_id, word, phonetic) VALUES (?, 'default', ?, ?)",
      [id, newWord.trim(), newPhonetic.trim()]
    );
    setNewWord("");
    setNewPhonetic("");
    loadPronunciations();
  };

  const removePronunciation = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM pronunciation_dictionary WHERE id = ?", [id]);
    loadPronunciations();
  };

  const saveSettings = async () => {
    if (!voiceId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE voices SET custom_settings = ? WHERE id = ?`,
        [JSON.stringify(settings), voiceId]
      );
      Alert.alert("Saved", "Voice settings saved successfully");
    } catch (e) {
      Alert.alert("Error", "Failed to save settings");
    }
    setSaving(false);
  };

  const SliderControl = ({ label, value, min, max, step, unit, onChange }: {
    label: string; value: number; min: number; max: number; step: number; unit: string;
    onChange: (v: number) => void;
  }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={[styles.sliderLabel, isDark && styles.darkText]}>{label}</Text>
          <Text style={[styles.sliderValue, isDark && styles.darkText]}>{value.toFixed(2)}{unit}</Text>
        </View>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
        </View>
        <View style={styles.sliderButtons}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => onChange(Math.max(min, value - step))}
          >
            <Ionicons name="remove" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => onChange(Math.min(max, value + step))}
          >
            <Ionicons name="add" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>
          {voiceName || "Voice"} Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SectionHeader title="Voice Parameters" />
        <Card>
          <SliderControl label="Pitch" value={settings.pitch} min={0.5} max={2.0} step={0.1} unit="x"
            onChange={(v) => setSettings({ ...settings, pitch: v })} />
          <SliderControl label="Speed" value={settings.speed} min={0.5} max={3.0} step={0.1} unit="x"
            onChange={(v) => setSettings({ ...settings, speed: v })} />
          <SliderControl label="Tone" value={settings.tone} min={0} max={1} step={0.05} unit=""
            onChange={(v) => setSettings({ ...settings, tone: v })} />
          <SliderControl label="Volume" value={settings.volume} min={0} max={1} step={0.05} unit=""
            onChange={(v) => setSettings({ ...settings, volume: v })} />
        </Card>

        <SectionHeader title="Pauses" />
        <Card>
          <SliderControl label="Between Sentences" value={settings.pauseBetweenSentences}
            min={0} max={2000} step={100} unit="ms"
            onChange={(v) => setSettings({ ...settings, pauseBetweenSentences: v })} />
          <SliderControl label="Between Paragraphs" value={settings.pauseBetweenParagraphs}
            min={0} max={5000} step={200} unit="ms"
            onChange={(v) => setSettings({ ...settings, pauseBetweenParagraphs: v })} />
        </Card>

        <SectionHeader title="Pronunciation Dictionary" />
        <Card>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Word"
              placeholderTextColor={isDark ? "#666" : "#999"}
              value={newWord}
              onChangeText={setNewWord}
            />
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Phonetic"
              placeholderTextColor={isDark ? "#666" : "#999"}
              value={newPhonetic}
              onChangeText={setNewPhonetic}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addPronunciation}>
              <Ionicons name="add-circle" size={28} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {pronunciations.map((p) => (
            <View key={p.id} style={styles.pronRow}>
              <View>
                <Text style={[styles.pronWord, isDark && styles.darkText]}>{p.word}</Text>
                <Text style={[styles.pronPhonetic, isDark && { color: "#999" }]}>/{p.phonetic}/</Text>
              </View>
              <TouchableOpacity onPress={() => removePronunciation(p.id)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {pronunciations.length === 0 && (
            <Text style={[styles.emptyText, isDark && { color: "#666" }]}>
              No custom pronunciations yet
            </Text>
          )}
        </Card>

        <Button title="Save Settings" onPress={saveSettings} loading={saving} fullWidth />

        <TouchableOpacity style={styles.previewBtn} onPress={() => Alert.alert("Preview", "Audio preview would play here with the current settings applied to a sample text.")}>
          <Ionicons name="play-circle" size={24} color="#6366f1" />
          <Text style={styles.previewText}>Preview Voice Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  darkContainer: { backgroundColor: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sliderContainer: { marginBottom: 16 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sliderLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  sliderValue: { fontSize: 14, fontWeight: "500", color: "#6366f1" },
  sliderTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  sliderFill: { height: "100%", backgroundColor: "#6366f1", borderRadius: 3 },
  sliderButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, gap: 8 },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  input: { flex: 1, height: 40, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff" },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  addBtn: { padding: 4 },
  pronRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  pronWord: { fontSize: 15, fontWeight: "600", color: "#111" },
  pronPhonetic: { fontSize: 13, color: "#666", fontStyle: "italic" },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 12 },
  previewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  previewText: { fontSize: 15, fontWeight: "600", color: "#6366f1" },
  darkText: { color: "#e2e8f0" },
});
