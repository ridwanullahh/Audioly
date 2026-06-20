import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { useAuthStore } from "@/lib/store/auth";
import { getDatabase } from "@/db/database";
import { Button, Card, EmptyState } from "@/components/ui";

interface Folder {
  id: string;
  name: string;
  color: string;
  audio_count: number;
  created_at: string;
}

const FOLDER_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#22c55e"];

export default function FoldersScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";

  const [folders, setFolders] = useState<Folder[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editName, setEditName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderAudio, setFolderAudio] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => { loadFolders(); }, []);

  const loadFolders = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<Folder>(
      "SELECT f.*, (SELECT COUNT(*) FROM folder_audio fa WHERE fa.folder_id = f.id) as audio_count FROM folders f ORDER BY f.name"
    );
    setFolders(result as Folder[]);
  };

  const loadFolderAudio = async (folderId: string) => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ id: string; title: string }>(
      `SELECT a.id, a.title FROM audio_files a INNER JOIN folder_audio fa ON fa.audio_id = a.id WHERE fa.folder_id = ?`,
      [folderId]
    );
    setFolderAudio(result as Array<{ id: string; title: string }>);
  };

  const createFolder = async () => {
    if (!newName.trim()) { Alert.alert("Error", "Folder name is required"); return; }
    const db = await getDatabase();
    const id = `folder_${Date.now()}`;
    await db.runAsync(
      "INSERT INTO folders (id, user_id, name, color) VALUES (?, ?, ?, ?)",
      [id, user?.id ?? "default", newName.trim(), selectedColor]
    );
    setNewName("");
    setShowCreate(false);
    loadFolders();
  };

  const renameFolder = async () => {
    if (!editingFolder || !editName.trim()) return;
    const db = await getDatabase();
    await db.runAsync("UPDATE folders SET name = ? WHERE id = ?", [editName.trim(), editingFolder.id]);
    setEditingFolder(null);
    loadFolders();
  };

  const deleteFolder = (folder: Folder) => {
    Alert.alert("Delete Folder", `Delete "${folder.name}"? Audio files won't be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM folders WHERE id = ?", [folder.id]);
        if (selectedFolder === folder.id) { setSelectedFolder(null); setFolderAudio([]); }
        loadFolders();
      }},
    ]);
  };

  const openFolder = (folder: Folder) => {
    if (selectedFolder === folder.id) {
      setSelectedFolder(null);
      setFolderAudio([]);
    } else {
      setSelectedFolder(folder.id);
      loadFolderAudio(folder.id);
    }
  };

  const removeAudioFromFolder = async (audioId: string) => {
    if (!selectedFolder) return;
    const db = await getDatabase();
    await db.runAsync("DELETE FROM folder_audio WHERE folder_id = ? AND audio_id = ?", [selectedFolder, audioId]);
    loadFolderAudio(selectedFolder);
    loadFolders();
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Folders</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {showCreate && (
        <Card style={styles.createCard}>
          <Text style={[styles.createTitle, isDark && styles.darkText]}>New Folder</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Folder name"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={newName}
            onChangeText={setNewName}
          />
          <Text style={[styles.colorLabel, isDark && styles.darkText]}>Color</Text>
          <View style={styles.colorRow}>
            {FOLDER_COLORS.map(c => (
              <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c },
                selectedColor === c && styles.colorSelected]} onPress={() => setSelectedColor(c)} />
            ))}
          </View>
          <Button title="Create Folder" onPress={createFolder} fullWidth />
        </Card>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {folders.length === 0 ? (
          <EmptyState icon="folder-open-outline" title="No folders yet"
            message="Organize your audio files into folders" />
        ) : (
          <>
            <View style={styles.grid}>
              {folders.map(folder => (
                <TouchableOpacity key={folder.id} style={[styles.folderCard, { borderLeftColor: folder.color }]}
                  onPress={() => openFolder(folder)} onLongPress={() => { setEditingFolder(folder); setEditName(folder.name); }}>
                  <View style={styles.folderHeader}>
                    <Ionicons name="folder" size={28} />
                    <View style={styles.folderActions}>
                      <TouchableOpacity onPress={() => { setEditingFolder(folder); setEditName(folder.name); }}>
                        <Ionicons name="create-outline" size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteFolder(folder)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.folderName, isDark && styles.darkText]} numberOfLines={1}>{folder.name}</Text>
                  <Text style={[styles.folderCount, isDark && { color: "#94a3b8" }]}>
                    {folder.audio_count} {folder.audio_count === 1 ? "file" : "files"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedFolder && (
              <Card style={styles.audioCard}>
                <Text style={[styles.audioTitle, isDark && styles.darkText]}>
                  Files in {folders.find(f => f.id === selectedFolder)?.name}
                </Text>
                {folderAudio.length === 0 ? (
                  <Text style={[styles.emptyAudio, isDark && { color: "#666" }]}>No audio files in this folder</Text>
                ) : (
                  folderAudio.map(audio => (
                    <View key={audio.id} style={styles.audioRow}>
                      <Ionicons name="musical-notes" size={20} color="#6366f1" />
                      <Text style={[styles.audioName, isDark && styles.darkText]} numberOfLines={1}>{audio.title}</Text>
                      <TouchableOpacity onPress={() => removeAudioFromFolder(audio.id)}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {editingFolder && (
        <View style={styles.modal}>
          <Card style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>Rename Folder</Text>
            <TextInput style={[styles.input, isDark && styles.darkInput]} value={editName} onChangeText={setEditName} autoFocus />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setEditingFolder(null)} />
              <Button title="Save" onPress={renameFolder} />
            </View>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  darkContainer: { backgroundColor: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  createCard: { marginHorizontal: 16, marginBottom: 12 },
  createTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  input: { height: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  colorLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: "#111" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  folderCard: { width: "47%", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  folderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  folderActions: { flexDirection: "row", gap: 8 },
  folderName: { fontSize: 15, fontWeight: "600", color: "#111" },
  folderCount: { fontSize: 12, color: "#64748b", marginTop: 2 },
  audioCard: { marginTop: 16 },
  audioTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptyAudio: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 12 },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  audioName: { flex: 1, fontSize: 14, color: "#111" },
  modal: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 12 },
  modalButtons: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 8 },
  darkText: { color: "#e2e8f0" },
});
