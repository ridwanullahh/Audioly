import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Card } from "@/components/ui";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  is_enabled: number;
  updated_at: string;
}

export default function AdminFeatureFlagsScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => { loadFlags(); }, []);

  const loadFlags = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<FeatureFlag>("SELECT * FROM feature_flags ORDER BY name");
    setFlags(result as FeatureFlag[]);
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    const db = await getDatabase();
    const newVal = flag.is_enabled ? 0 : 1;
    await db.runAsync(
      "UPDATE feature_flags SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?",
      [newVal, flag.id]
    );
    loadFlags();
  };

  const seedDefaults = async () => {
    const db = await getDatabase();
    const defaults = [
      { name: "voice_cloning", description: "Enable voice cloning feature for users" },
      { name: "podcast_mode", description: "Enable podcast-style dialogue narration" },
      { name: "multi_voice", description: "Enable multi-voice narration per document" },
      { name: "background_audio", description: "Enable background ambient sounds" },
      { name: "sharing", description: "Enable sharing and publishing features" },
      { name: "api_access", description: "Enable developer API key generation" },
      { name: "webhooks", description: "Enable webhook integrations" },
      { name: "rss_feed", description: "Enable podcast RSS feed generation" },
      { name: "offline_mode", description: "Enable offline download and playback" },
      { name: "ai_agent", description: "Enable AI agent proactive suggestions" },
      { name: "referral_program", description: "Enable referral program" },
      { name: "dark_mode", description: "Enable dark mode theme" },
      { name: "beta_features", description: "Enable experimental beta features" },
    ];
    for (const f of defaults) {
      const existing = await db.getFirstAsync<{ id: string }>("SELECT id FROM feature_flags WHERE name = ?", [f.name]);
      if (!existing) {
        await db.runAsync(
          "INSERT INTO feature_flags (id, name, description, is_enabled) VALUES (?, ?, ?, 0)",
          [`ff_${f.name}`, f.name, f.description]
        );
      }
    }
    loadFlags();
  };

  const enabledCount = flags.filter(f => f.is_enabled).length;

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Feature Flags</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, isDark && styles.darkCard]}>
          <Text style={styles.summaryValue}>{enabledCount}</Text>
          <Text style={[styles.summaryLabel, isDark && { color: "#94a3b8" }]}>Enabled</Text>
        </View>
        <View style={[styles.summaryCard, isDark && styles.darkCard]}>
          <Text style={styles.summaryValue}>{flags.length - enabledCount}</Text>
          <Text style={[styles.summaryLabel, isDark && { color: "#94a3b8" }]}>Disabled</Text>
        </View>
        <View style={[styles.summaryCard, isDark && styles.darkCard]}>
          <Text style={styles.summaryValue}>{flags.length}</Text>
          <Text style={[styles.summaryLabel, isDark && { color: "#94a3b8" }]}>Total</Text>
        </View>
      </View>

      {flags.length === 0 && (
        <TouchableOpacity style={styles.seedBtn} onPress={seedDefaults}>
          <Ionicons name="sparkles" size={20} color="#6366f1" />
          <Text style={styles.seedText}>Initialize Default Feature Flags</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {flags.map(flag => (
          <Card key={flag.id} style={styles.flagCard}>
            <View style={styles.flagRow}>
              <View style={styles.flagInfo}>
                <Text style={[styles.flagName, isDark && styles.darkText]}>{flag.name.replace(/_/g, " ")}</Text>
                <Text style={[styles.flagDesc, isDark && { color: "#94a3b8" }]}>{flag.description}</Text>
              </View>
              <Switch
                value={!!flag.is_enabled}
                onValueChange={() => toggleFlag(flag)}
                trackColor={{ false: "#e2e8f0", true: "#c7d2fe" }}
                thumbColor={flag.is_enabled ? "#6366f1" : "#94a3b8"}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  darkContainer: { backgroundColor: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 12, alignItems: "center" },
  darkCard: { backgroundColor: "#1e293b" },
  summaryValue: { fontSize: 24, fontWeight: "800", color: "#6366f1" },
  summaryLabel: { fontSize: 12, color: "#64748b", marginTop: 2 },
  seedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, paddingVertical: 14, backgroundColor: "#eef2ff", borderRadius: 10, marginBottom: 8 },
  seedText: { fontSize: 15, fontWeight: "600", color: "#6366f1" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  flagCard: { marginBottom: 8 },
  flagRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flagInfo: { flex: 1, marginRight: 12 },
  flagName: { fontSize: 15, fontWeight: "600", color: "#111", textTransform: "capitalize" },
  flagDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  darkText: { color: "#e2e8f0" },
});
