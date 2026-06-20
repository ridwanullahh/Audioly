import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export default function AdminBlogScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<BlogPost>("SELECT * FROM blog_posts ORDER BY created_at DESC");
    setPosts(result as BlogPost[]);
  };

  const savePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (postId) {
        await db.runAsync(
          "UPDATE blog_posts SET title = ?, slug = ?, content = ?, excerpt = ?, updated_at = datetime('now') WHERE id = ?",
          [title.trim(), slug, content.trim(), excerpt.trim(), postId]
        );
      } else {
        const id = `blog_${Date.now()}`;
        await db.runAsync(
          "INSERT INTO blog_posts (id, title, slug, content, excerpt, status, author) VALUES (?, ?, ?, ?, ?, 'draft', 'admin')",
          [id, title.trim(), slug, content.trim(), excerpt.trim()]
        );
      }
      resetForm();
      loadPosts();
    } catch { Alert.alert("Error", "Failed to save post"); }
    setSaving(false);
  };

  const publishPost = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE blog_posts SET status = 'published', updated_at = datetime('now') WHERE id = ?", [id]);
    loadPosts();
  };

  const unpublishPost = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE blog_posts SET status = 'draft', updated_at = datetime('now') WHERE id = ?", [id]);
    loadPosts();
  };

  const deletePost = (post: BlogPost) => {
    Alert.alert("Delete", `Delete "${post.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM blog_posts WHERE id = ?", [post.id]);
        loadPosts();
      }},
    ]);
  };

  const editPost = (post: BlogPost) => {
    setPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt);
    setEditing(true);
  };

  const resetForm = () => {
    setEditing(false);
    setPostId(null);
    setTitle("");
    setContent("");
    setExcerpt("");
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Blog CMS</Text>
        <TouchableOpacity onPress={() => { if (editing) resetForm(); else setEditing(true); }}>
          <Ionicons name={editing ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {editing && (
        <Card style={styles.editorCard}>
          <Text style={[styles.editorTitle, isDark && styles.darkText]}>
            {postId ? "Edit Post" : "New Post"}
          </Text>
          <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="Title"
            placeholderTextColor={isDark ? "#666" : "#999"} value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="Excerpt (short summary)"
            placeholderTextColor={isDark ? "#666" : "#999"} value={excerpt} onChangeText={setExcerpt} />
          <TextInput style={[styles.textArea, isDark && styles.darkInput]} placeholder="Write your post content here..."
            placeholderTextColor={isDark ? "#666" : "#999"} value={content} onChangeText={setContent}
            multiline numberOfLines={10} textAlignVertical="top" />
          <View style={styles.btnRow}>
            <Button title="Cancel" variant="outline" onPress={resetForm} />
            <Button title={postId ? "Update" : "Save Draft"} onPress={savePost} loading={saving} />
          </View>
        </Card>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {posts.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No blog posts" message="Create your first blog post" />
        ) : (
          posts.map(post => (
            <Card key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Text style={[styles.postTitle, isDark && styles.darkText]} numberOfLines={1}>{post.title}</Text>
                <Badge text={post.status} />
              </View>
              <Text style={[styles.postExcerpt, isDark && { color: "#94a3b8" }]} numberOfLines={2}>
                {post.excerpt || "No excerpt"}
              </Text>
              <View style={styles.postFooter}>
                <Text style={[styles.postDate, isDark && { color: "#64748b" }]}>{post.created_at?.split("T")[0]}</Text>
                <View style={styles.postActions}>
                  {post.status === "draft" ? (
                    <TouchableOpacity onPress={() => publishPost(post.id)}>
                      <Ionicons name="rocket-outline" size={20} color="#22c55e" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => unpublishPost(post.id)}>
                      <Ionicons name="archive-outline" size={20} color="#f59e0b" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => editPost(post)}>
                    <Ionicons name="create-outline" size={20} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deletePost(post)}>
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
  textArea: { minHeight: 160, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  btnRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  postCard: { marginBottom: 10 },
  postHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  postTitle: { fontSize: 16, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  postExcerpt: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  postFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  postDate: { fontSize: 12, color: "#94a3b8" },
  postActions: { flexDirection: "row", gap: 12 },
  darkText: { color: "#e2e8f0" },
});
