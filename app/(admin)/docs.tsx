import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

interface DocsPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  status: string;
  sort_order: number;
  created_at: string;
}

export default function AdminDocsScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [pages, setPages] = useState<DocsPage[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("getting-started");
  const [sortOrder, setSortOrder] = useState("0");
  const [pageId, setPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => { loadPages(); }, []);

  const loadPages = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<DocsPage>("SELECT * FROM docs_pages ORDER BY sort_order ASC, created_at DESC");
    setPages(result as DocsPage[]);
  };

  const savePage = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (pageId) {
        await db.runAsync(
          "UPDATE docs_pages SET title = ?, slug = ?, content = ?, category = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
          [title.trim(), slug, content.trim(), category, parseInt(sortOrder) || 0, pageId]
        );
      } else {
        const id = `doc_${Date.now()}`;
        await db.runAsync(
          "INSERT INTO docs_pages (id, title, slug, content, category, status, sort_order) VALUES (?, ?, ?, ?, ?, 'draft', ?)",
          [id, title.trim(), slug, content.trim(), category, parseInt(sortOrder) || 0]
        );
      }
      resetForm();
      loadPages();
    } catch { Alert.alert("Error", "Failed to save page"); }
    setSaving(false);
  };

  const publishPage = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE docs_pages SET status = 'published' WHERE id = ?", [id]);
    loadPages();
  };

  const deletePage = (page: DocsPage) => {
    Alert.alert("Delete", `Delete "${page.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM docs_pages WHERE id = ?", [page.id]);
        loadPages();
      }},
    ]);
  };

  const editPage = (page: DocsPage) => {
    setPageId(page.id);
    setTitle(page.title);
    setContent(page.content);
    setCategory(page.category);
    setSortOrder(String(page.sort_order));
    setEditing(true);
  };

  const resetForm = () => {
    setEditing(false); setPageId(null); setTitle(""); setContent("");
    setCategory("getting-started"); setSortOrder("0");
  };

  const categories = ["all", ...Array.from(new Set(pages.map(p => p.category)))];
  const filtered = filterCat === "all" ? pages : pages.filter(p => p.category === filterCat);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Docs CMS</Text>
        <TouchableOpacity onPress={() => { if (editing) resetForm(); else setEditing(true); }}>
          <Ionicons name={editing ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {editing && (
        <Card style={styles.editorCard}>
          <Text style={[styles.editorTitle, isDark && styles.darkText]}>
            {pageId ? "Edit Page" : "New Doc Page"}
          </Text>
          <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="Title"
            placeholderTextColor={isDark ? "#666" : "#999"} value={title} onChangeText={setTitle} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, isDark && styles.darkText]}>Category</Text>
              <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="Category"
                placeholderTextColor={isDark ? "#666" : "#999"} value={category} onChangeText={setCategory} />
            </View>
            <View style={{ width: 80 }}>
              <Text style={[styles.label, isDark && styles.darkText]}>Order</Text>
              <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="0"
                placeholderTextColor={isDark ? "#666" : "#999"} value={sortOrder} onChangeText={setSortOrder}
                keyboardType="number-pad" />
            </View>
          </View>
          <TextInput style={[styles.textArea, isDark && styles.darkInput]} placeholder="Documentation content (markdown supported)..."
            placeholderTextColor={isDark ? "#666" : "#999"} value={content} onChangeText={setContent}
            multiline numberOfLines={12} textAlignVertical="top" />
          <View style={styles.btnRow}>
            <Button title="Cancel" variant="outline" onPress={resetForm} />
            <Button title={pageId ? "Update" : "Save"} onPress={savePage} loading={saving} />
          </View>
        </Card>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {categories.map(c => (
          <TouchableOpacity key={c} style={[styles.filterBtn, filterCat === c && { backgroundColor: "#6366f1" }]}
            onPress={() => setFilterCat(c)}>
            <Text style={[styles.filterText, filterCat === c && { color: "#fff" }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <EmptyState icon="book-outline" title="No doc pages" message="Create your first documentation page" />
        ) : (
          filtered.map(page => (
            <Card key={page.id} style={styles.pageCard}>
              <View style={styles.pageHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pageTitle, isDark && styles.darkText]} numberOfLines={1}>{page.title}</Text>
                  <Badge text={page.category} />
                </View>
                <Badge text={page.status} />
              </View>
              <View style={styles.pageFooter}>
                <Text style={[styles.pageOrder, isDark && { color: "#64748b" }]}>Order: {page.sort_order}</Text>
                <View style={styles.pageActions}>
                  {page.status === "draft" && (
                    <TouchableOpacity onPress={() => publishPage(page.id)}>
                      <Ionicons name="rocket-outline" size={20} color="#22c55e" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => editPage(page)}>
                    <Ionicons name="create-outline" size={20} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deletePage(page)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
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
  editorCard: { marginHorizontal: 16, marginBottom: 12 },
  editorTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  input: { height: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  row2: { flexDirection: "row", gap: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 4 },
  textArea: { minHeight: 180, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  btnRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  filterRow: { maxHeight: 44, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f1f5f9" },
  filterText: { fontSize: 13, fontWeight: "500", color: "#333", textTransform: "capitalize" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageCard: { marginBottom: 10 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  pageTitle: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 4 },
  pageFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageOrder: { fontSize: 12, color: "#94a3b8" },
  pageActions: { flexDirection: "row", gap: 12 },
  darkText: { color: "#e2e8f0" },
});
