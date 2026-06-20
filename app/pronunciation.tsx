import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Button, Card, SectionHeader, EmptyState } from "@/components/ui";

interface PronunciationEntry {
  id: string;
  word: string;
  phonetic: string;
  created_at: string;
}

export default function PronunciationScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [entries, setEntries] = useState<PronunciationEntry[]>([]);
  const [search, setSearch] = useState("");
  const [newWord, setNewWord] = useState("");
  const [newPhonetic, setNewPhonetic] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhonetic, setEditPhonetic] = useState("");

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<PronunciationEntry>(
      "SELECT * FROM pronunciation_dictionary ORDER BY word ASC"
    );
    setEntries(result as PronunciationEntry[]);
  };

  const addEntry = async () => {
    if (!newWord.trim() || !newPhonetic.trim()) {
      Alert.alert("Error", "Both word and phonetic spelling are required");
      return;
    }
    const db = await getDatabase();
    const id = `pron_${Date.now()}`;
    await db.runAsync(
      "INSERT INTO pronunciation_dictionary (id, user_id, word, phonetic) VALUES (?, 'default', ?, ?)",
      [id, newWord.trim().toLowerCase(), newPhonetic.trim()]
    );
    setNewWord("");
    setNewPhonetic("");
    setShowAdd(false);
    loadEntries();
  };

  const updateEntry = async (id: string) => {
    if (!editPhonetic.trim()) return;
    const db = await getDatabase();
    await db.runAsync("UPDATE pronunciation_dictionary SET phonetic = ? WHERE id = ?", [editPhonetic.trim(), id]);
    setEditingId(null);
    setEditPhonetic("");
    loadEntries();
  };

  const deleteEntry = async (id: string) => {
    Alert.alert("Delete", "Remove this pronunciation entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM pronunciation_dictionary WHERE id = ?", [id]);
        loadEntries();
      }},
    ]);
  };

  const filtered = entries.filter(e =>
    e.word.toLowerCase().includes(search.toLowerCase()) ||
    e.phonetic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Pronunciation Dictionary</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)}>
          <Ionicons name={showAdd ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isDark && styles.darkInput]}
          placeholder="Search words..."
          placeholderTextColor={isDark ? "#666" : "#999"}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {showAdd && (
        <Card style={styles.addCard}>
          <Text style={[styles.addTitle, isDark && styles.darkText]}>Add New Pronunciation</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Word (e.g. Audioly)"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={newWord}
            onChangeText={setNewWord}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Phonetic (e.g. aw-dee-OH-lee)"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={newPhonetic}
            onChangeText={setNewPhonetic}
          />
          <View style={styles.addButtons}>
            <Button title="Cancel" variant="outline" onPress={() => setShowAdd(false)} />
            <Button title="Add" onPress={addEntry} />
          </View>
        </Card>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.count, isDark && { color: "#94a3b8" }]}>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No pronunciations"
            message="Add custom pronunciations for words the AI mispronounces"
           
          />
        ) : (
          filtered.map((entry) => (
            <View key={entry.id} style={[styles.entryRow, isDark && styles.darkEntryRow]}>
              <View style={styles.entryContent}>
                <Text style={[styles.entryWord, isDark && styles.darkText]}>{entry.word}</Text>
                {editingId === entry.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={[styles.editInput, isDark && styles.darkInput]}
                      value={editPhonetic}
                      onChangeText={setEditPhonetic}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => updateEntry(entry.id)}>
                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingId(null)}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.entryPhonetic, isDark && { color: "#94a3b8" }]}>
                    /{entry.phonetic}/
                  </Text>
                )}
              </View>
              {editingId !== entry.id && (
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => { setEditingId(entry.id); setEditPhonetic(entry.phonetic); }}>
                    <Ionicons name="create-outline" size={20} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  darkContainer: { backgroundColor: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10 },
  searchIcon: { paddingLeft: 12 },
  searchInput: { flex: 1, height: 42, paddingHorizontal: 8, fontSize: 15, color: "#111" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  addCard: { marginHorizontal: 16, marginBottom: 12 },
  addTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  input: { height: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  addButtons: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 4 },
  count: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#fff", borderRadius: 10, marginBottom: 8 },
  darkEntryRow: { backgroundColor: "#1e293b" },
  entryContent: { flex: 1 },
  entryWord: { fontSize: 16, fontWeight: "600", color: "#111" },
  entryPhonetic: { fontSize: 14, color: "#64748b", fontStyle: "italic", marginTop: 2 },
  entryActions: { flexDirection: "row", gap: 12 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  editInput: { flex: 1, height: 36, borderWidth: 1, borderColor: "#6366f1", borderRadius: 6, paddingHorizontal: 8, fontSize: 14, color: "#111" },
  darkText: { color: "#e2e8f0" },
});
