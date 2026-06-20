import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { useAuthStore } from "@/lib/store/auth";
import { getDatabase } from "@/db/database";
import { Button, Card, EmptyState } from "@/components/ui";

interface Feedback {
  id: string;
  project_id: string;
  rating: number;
  comment: string;
  section_index: number | null;
  is_resolved: number;
  created_at: string;
}

export default function FeedbackScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { theme } = useAppStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sectionIndex, setSectionIndex] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFeedbacks(); }, [projectId]);

  const loadFeedbacks = async () => {
    const db = await getDatabase();
    let query = "SELECT * FROM user_feedback";
    const params: string[] = [];
    if (projectId) {
      query += " WHERE project_id = ?";
      params.push(projectId);
    }
    query += " ORDER BY created_at DESC";
    const result = await db.getAllAsync<Feedback>(query, params);
    setFeedbacks(result as Feedback[]);
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const id = `fb_${Date.now()}`;
      await db.runAsync(
        "INSERT INTO user_feedback (id, project_id, user_id, rating, comment, section_index) VALUES (?, ?, ?, ?, ?, ?)",
        [id, projectId ?? "general", user?.id ?? "default", rating, comment.trim(), sectionIndex ? parseInt(sectionIndex) : null]
      );
      setRating(0);
      setComment("");
      setSectionIndex("");
      setShowForm(false);
      loadFeedbacks();
      Alert.alert("Thanks", "Your feedback has been submitted");
    } catch {
      Alert.alert("Error", "Failed to submit feedback");
    }
    setSaving(false);
  };

  const resolveFeedback = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE user_feedback SET is_resolved = 1 WHERE id = ?", [id]);
    loadFeedbacks();
  };

  const renderStars = (count: number, interactive = false) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity key={i} disabled={!interactive} onPress={() => interactive && setRating(i)}>
            <Ionicons
              name={i <= count ? "star" : "star-outline"}
              size={interactive ? 32 : 18}
             
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Feedback</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, isDark && styles.darkText]}>Rate This Project</Text>
          <View style={styles.ratingRow}>
            {renderStars(rating, true)}
          </View>
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Section index (optional)"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={sectionIndex}
            onChangeText={setSectionIndex}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.textArea, isDark && styles.darkInput]}
            placeholder="Your feedback (optional)..."
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Button title="Submit Feedback" onPress={submitFeedback} loading={saving} fullWidth />
        </Card>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {feedbacks.length === 0 ? (
          <EmptyState icon="chatbubble-ellipses-outline" title="No feedback yet"
            message="Rate your narration quality" />
        ) : (
          feedbacks.map(fb => (
            <Card key={fb.id} style={styles.fbCard}>
              <View style={styles.fbHeader}>
                {renderStars(fb.rating)}
                {fb.is_resolved ? (
                  <View style={styles.resolvedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.resolvedText}>Resolved</Text>
                  </View>
                ) : null}
              </View>
              {fb.section_index !== null && (
                <Text style={[styles.sectionLabel, isDark && { color: "#94a3b8" }]}>
                  Section {fb.section_index + 1}
                </Text>
              )}
              {fb.comment ? (
                <Text style={[styles.fbComment, isDark && { color: "#cbd5e1" }]}>{fb.comment}</Text>
              ) : null}
              <View style={styles.fbFooter}>
                <Text style={[styles.fbDate, isDark && { color: "#64748b" }]}>{fb.created_at?.split("T")[0]}</Text>
                {!fb.is_resolved && (
                  <TouchableOpacity onPress={() => resolveFeedback(fb.id)}>
                    <Text style={styles.resolveBtn}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
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
  formCard: { marginHorizontal: 16, marginBottom: 12 },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  ratingRow: { alignItems: "center", marginBottom: 12 },
  starsRow: { flexDirection: "row", gap: 4 },
  input: { height: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  textArea: { height: 80, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  fbCard: { marginBottom: 10 },
  fbHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  resolvedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  resolvedText: { fontSize: 12, fontWeight: "600", color: "#22c55e" },
  sectionLabel: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  fbComment: { fontSize: 14, color: "#334155", marginBottom: 8, lineHeight: 20 },
  fbFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fbDate: { fontSize: 12, color: "#94a3b8" },
  resolveBtn: { fontSize: 13, fontWeight: "600", color: "#6366f1" },
  darkText: { color: "#e2e8f0" },
});
