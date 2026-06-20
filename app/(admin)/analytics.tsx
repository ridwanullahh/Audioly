import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Card } from "@/components/ui";

interface StatRow {
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [stats, setStats] = useState({
    users: 0, activeUsers: 0, documents: 0, projects: 0, audioFiles: 0,
    totalAudioSeconds: 0, totalCharacters: 0, clones: 0, shares: 0,
  });
  const [usageLogs, setUsageLogs] = useState<Array<{ action: string; count: number }>>([]);
  const [providerUsage, setProviderUsage] = useState<Array<{ provider: string; count: number }>>([]);
  const [recentLogs, setRecentLogs] = useState<Array<{ action: string; model: string; created_at: string }>>([]);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    const db = await getDatabase();

    const userCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM users");
    const activeUsers = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM users WHERE is_active = 1");
    const docCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM documents");
    const projCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM projects");
    const audioCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM audio_files");
    const audioSec = await db.getFirstAsync<{ c: number }>("SELECT COALESCE(SUM(duration_seconds), 0) as c FROM audio_files");
    const charCount = await db.getFirstAsync<{ c: number }>("SELECT COALESCE(SUM(characters), 0) as c FROM usage_logs");
    const cloneCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM voice_clones");
    const shareCount = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM share_links");

    setStats({
      users: userCount?.c ?? 0,
      activeUsers: activeUsers?.c ?? 0,
      documents: docCount?.c ?? 0,
      projects: projCount?.c ?? 0,
      audioFiles: audioCount?.c ?? 0,
      totalAudioSeconds: audioSec?.c ?? 0,
      totalCharacters: charCount?.c ?? 0,
      clones: cloneCount?.c ?? 0,
      shares: shareCount?.c ?? 0,
    });

    const actionCounts = await db.getAllAsync<{ action: string; count: number }>(
      "SELECT action, COUNT(*) as count FROM usage_logs GROUP BY action ORDER BY count DESC"
    );
    setUsageLogs(actionCounts as Array<{ action: string; count: number }>);

    const provCounts = await db.getAllAsync<{ provider: string; count: number }>(
      "SELECT provider, COUNT(*) as count FROM usage_logs WHERE provider IS NOT NULL GROUP BY provider ORDER BY count DESC"
    );
    setProviderUsage(provCounts as Array<{ provider: string; count: number }>);

    const recent = await db.getAllAsync<{ action: string; model: string; created_at: string }>(
      "SELECT action, COALESCE(model, '') as model, created_at FROM usage_logs ORDER BY created_at DESC LIMIT 20"
    );
    setRecentLogs(recent as Array<{ action: string; model: string; created_at: string }>);
  };

  const statRows: StatRow[] = [
    { label: "Total Users", count: stats.users, icon: "people", color: "#6366f1" },
    { label: "Active Users", count: stats.activeUsers, icon: "person-circle", color: "#22c55e" },
    { label: "Documents", count: stats.documents, icon: "document-text", color: "#3b82f6" },
    { label: "Projects", count: stats.projects, icon: "folder-open", color: "#f59e0b" },
    { label: "Audio Files", count: stats.audioFiles, icon: "musical-notes", color: "#ec4899" },
    { label: "Voice Clones", count: stats.clones, icon: "mic", color: "#8b5cf6" },
    { label: "Shares", count: stats.shares, icon: "share-social", color: "#14b8a6" },
  ];

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Overview</Text>
        <View style={styles.grid}>
          {statRows.map(row => (
            <View key={row.label} style={[styles.statCard, isDark && styles.darkCard]}>
              <Ionicons name={row.icon} size={24} />
              <Text style={[styles.statValue, { color: row.color }]}>{formatNumber(row.count)}</Text>
              <Text style={[styles.statLabel, isDark && { color: "#94a3b8" }]}>{row.label}</Text>
            </View>
          ))}
          <View style={[styles.statCard, isDark && styles.darkCard]}>
            <Ionicons name="time" size={24} color="#06b6d4" />
            <Text style={[styles.statValue, { color: "#06b6d4" }]}>{formatDuration(stats.totalAudioSeconds)}</Text>
            <Text style={[styles.statLabel, isDark && { color: "#94a3b8" }]}>Audio Generated</Text>
          </View>
          <View style={[styles.statCard, isDark && styles.darkCard]}>
            <Ionicons name="text" size={24} color="#ef4444" />
            <Text style={[styles.statValue, { color: "#ef4444" }]}>{formatNumber(stats.totalCharacters)}</Text>
            <Text style={[styles.statLabel, isDark && { color: "#94a3b8" }]}>Characters Processed</Text>
          </View>
        </View>

        {usageLogs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Usage by Action</Text>
            <Card>
              {usageLogs.map(log => (
                <View key={log.action} style={styles.barRow}>
                  <Text style={[styles.barLabel, isDark && styles.darkText]}>{log.action}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, {
                      width: `${Math.min(100, (log.count / Math.max(...usageLogs.map(l => l.count))) * 100)}%`,
                    }]} />
                  </View>
                  <Text style={[styles.barCount, isDark && { color: "#94a3b8" }]}>{log.count}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {providerUsage.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Usage by Provider</Text>
            <Card>
              {providerUsage.map(p => (
                <View key={p.provider} style={styles.barRow}>
                  <Text style={[styles.barLabel, isDark && styles.darkText]}>{p.provider}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, {
                      width: `${Math.min(100, (p.count / Math.max(...providerUsage.map(x => x.count))) * 100)}%`,
                      backgroundColor: "#8b5cf6",
                    }]} />
                  </View>
                  <Text style={[styles.barCount, isDark && { color: "#94a3b8" }]}>{p.count}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {recentLogs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Recent Activity</Text>
            <Card>
              {recentLogs.map((log, i) => (
                <View key={i} style={styles.logRow}>
                  <View style={styles.logLeft}>
                    <Ionicons name="pulse-outline" size={16} color="#6366f1" />
                    <View>
                      <Text style={[styles.logAction, isDark && styles.darkText]}>{log.action}</Text>
                      {log.model ? <Text style={[styles.logModel, isDark && { color: "#64748b" }]}>{log.model}</Text> : null}
                    </View>
                  </View>
                  <Text style={[styles.logTime, isDark && { color: "#64748b" }]}>
                    {log.created_at?.split("T")[1]?.substring(0, 5) ?? ""}
                  </Text>
                </View>
              ))}
            </Card>
          </>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginTop: 16, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "30%", backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  darkCard: { backgroundColor: "#1e293b" },
  statValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2, textAlign: "center" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  barLabel: { width: 80, fontSize: 13, fontWeight: "500", color: "#333", textTransform: "capitalize" },
  barTrack: { flex: 1, height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#6366f1", borderRadius: 4 },
  barCount: { width: 40, fontSize: 13, fontWeight: "600", color: "#333", textAlign: "right" },
  logRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  logLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logAction: { fontSize: 14, fontWeight: "500", color: "#111" },
  logModel: { fontSize: 11, color: "#94a3b8" },
  logTime: { fontSize: 12, color: "#94a3b8" },
  darkText: { color: "#e2e8f0" },
});
