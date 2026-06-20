import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Button, EmptyState } from "@/components/ui";

interface TrashItem {
  id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  deleted_at: string;
  expires_at: string;
}

export default function TrashScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadTrash(); }, []);

  const loadTrash = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<TrashItem>(
      "SELECT * FROM trash_items ORDER BY deleted_at DESC"
    );
    setItems(result as TrashItem[]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const restoreItem = async (item: TrashItem) => {
    const db = await getDatabase();
    const tableMap: Record<string, string> = {
      document: "documents",
      project: "projects",
      audio: "audio_files",
      playlist: "playlists",
    };
    const table = tableMap[item.item_type];
    if (table) {
      await db.runAsync(`UPDATE ${table} SET is_deleted = 0 WHERE id = ?`, [item.item_id]);
    }
    await db.runAsync("DELETE FROM trash_items WHERE id = ?", [item.id]);
    loadTrash();
  };

  const permanentDelete = async (item: TrashItem) => {
    Alert.alert("Permanent Delete", `Permanently delete "${item.item_name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Forever", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        const tableMap: Record<string, string> = {
          document: "documents",
          project: "projects",
          audio: "audio_files",
          playlist: "playlists",
        };
        const table = tableMap[item.item_type];
        if (table) {
          await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [item.item_id]);
        }
        await db.runAsync("DELETE FROM trash_items WHERE id = ?", [item.id]);
        loadTrash();
      }},
    ]);
  };

  const restoreSelected = async () => {
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id);
      if (item) await restoreItem(item);
    }
    setSelectedIds(new Set());
  };

  const emptyTrash = () => {
    Alert.alert("Empty Trash", "Permanently delete all items in trash?", [
      { text: "Cancel", style: "cancel" },
      { text: "Empty Trash", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        for (const item of items) {
          const tableMap: Record<string, string> = {
            document: "documents", project: "projects", audio: "audio_files", playlist: "playlists",
          };
          const table = tableMap[item.item_type];
          if (table) await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [item.item_id]);
        }
        await db.runAsync("DELETE FROM trash_items");
        setSelectedIds(new Set());
        loadTrash();
      }},
    ]);
  };

  const getDaysLeft = (expiresAt: string) => {
    try {
      const exp = new Date(expiresAt + "Z");
      const now = new Date();
      const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    } catch { return 0; }
  };

  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    document: "document-text",
    project: "folder-open",
    audio: "musical-notes",
    playlist: "list",
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Trash</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={emptyTrash}>
            <Ionicons name="trash" size={22} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {items.length > 0 && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={selectAll}>
            <Text style={[styles.toolbarText, isDark && styles.darkText]}>
              {selectedIds.size === items.length ? "Deselect All" : "Select All"}
            </Text>
          </TouchableOpacity>
          {selectedIds.size > 0 && (
            <TouchableOpacity onPress={restoreSelected}>
              <Text style={styles.restoreSelected}>Restore {selectedIds.size} items</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <EmptyState icon="trash-outline" title="Trash is empty"
            message="Deleted items will appear here for 30 days" />
        ) : (
          items.map(item => {
            const daysLeft = getDaysLeft(item.expires_at);
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity key={item.id}
                style={[styles.itemCard, isDark && styles.darkCard, isSelected && styles.selectedCard]}
                onPress={() => toggleSelect(item.id)}>
                <View style={styles.itemLeft}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Ionicons name={typeIcons[item.item_type] ?? "help-circle"} size={22} color="#6366f1" />
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, isDark && styles.darkText]} numberOfLines={1}>{item.item_name}</Text>
                    <Text style={[styles.itemMeta, isDark && { color: "#64748b" }]}>
                      {item.item_type} - {daysLeft} days left
                    </Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => restoreItem(item)} style={styles.actionBtn}>
                    <Ionicons name="refresh-outline" size={20} color="#22c55e" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => permanentDelete(item)} style={styles.actionBtn}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
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
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  toolbarText: { fontSize: 14, fontWeight: "500", color: "#6366f1" },
  restoreSelected: { fontSize: 14, fontWeight: "600", color: "#22c55e" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  itemCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8 },
  darkCard: { backgroundColor: "#1e293b" },
  selectedCard: { borderWidth: 2, borderColor: "#6366f1" },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#111" },
  itemMeta: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  itemActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 4 },
  darkText: { color: "#e2e8f0" },
});
