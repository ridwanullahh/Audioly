import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { useAuthStore } from "@/lib/store/auth";
import { getDatabase } from "@/db/database";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string;
  is_active: number;
  last_used: string | null;
  created_at: string;
}

export default function APIKeysScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [permissions, setPermissions] = useState("read");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<APIKey>(
      "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
      [user?.id ?? "default"]
    );
    setKeys(result as APIKey[]);
  };

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "aud_";
    for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const createKey = async () => {
    if (!keyName.trim()) {
      Alert.alert("Error", "Key name is required");
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const id = `apikey_${Date.now()}`;
      const key = generateKey();
      await db.runAsync(
        "INSERT INTO api_keys (id, user_id, name, key, permissions) VALUES (?, ?, ?, ?, ?)",
        [id, user?.id ?? "default", keyName.trim(), key, permissions]
      );
      setNewKey(key);
      setKeyName("");
      setShowCreate(false);
      loadKeys();
    } catch {
      Alert.alert("Error", "Failed to create API key");
    }
    setSaving(false);
  };

  const revokeKey = (apiKey: APIKey) => {
    Alert.alert("Revoke Key", `Revoke "${apiKey.name}"? Any applications using this key will stop working.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("UPDATE api_keys SET is_active = 0 WHERE id = ?", [apiKey.id]);
        loadKeys();
      }},
    ]);
  };

  const deleteKey = (apiKey: APIKey) => {
    Alert.alert("Delete Key", `Permanently delete "${apiKey.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM api_keys WHERE id = ?", [apiKey.id]);
        loadKeys();
      }},
    ]);
  };

  const copyKey = (key: string) => {
    Alert.alert("API Key", key);
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>API Keys</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {newKey && (
        <Card style={styles.newKeyCard}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={[styles.newKeyTitle, isDark && styles.darkText]}>Key Created Successfully</Text>
          <Text style={[styles.newKeyWarning, isDark && { color: "#fbbf24" }]}>
            Copy this key now. You won't be able to see it again.
          </Text>
          <TouchableOpacity style={styles.keyDisplay} onPress={() => copyKey(newKey)}>
            <Text style={styles.keyText} numberOfLines={1}>{newKey}</Text>
            <Ionicons name="copy-outline" size={20} color="#6366f1" />
          </TouchableOpacity>
          <Button title="I've Copied It" onPress={() => setNewKey(null)} fullWidth />
        </Card>
      )}

      {showCreate && (
        <Card style={styles.createCard}>
          <Text style={[styles.createTitle, isDark && styles.darkText]}>Create API Key</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Key name (e.g. My App)"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={keyName}
            onChangeText={setKeyName}
          />
          <Text style={[styles.permLabel, isDark && styles.darkText]}>Permissions</Text>
          <View style={styles.permRow}>
            {[
              { value: "read", label: "Read Only" },
              { value: "write", label: "Read & Write" },
              { value: "admin", label: "Full Access" },
            ].map(p => (
              <TouchableOpacity key={p.value}
                style={[styles.permBtn, permissions === p.value && { backgroundColor: "#6366f1" }]}
                onPress={() => setPermissions(p.value)}>
                <Text style={[styles.permText, permissions === p.value && { color: "#fff" }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="Generate Key" onPress={createKey} loading={saving} fullWidth />
        </Card>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {keys.length === 0 ? (
          <EmptyState icon="key-outline" title="No API keys"
            message="Create API keys to integrate with your applications" />
        ) : (
          <>
            <Card style={styles.docsCard}>
              <Text style={[styles.docsTitle, isDark && styles.darkText]}>API Documentation</Text>
              <Text style={[styles.docsText, isDark && { color: "#94a3b8" }]}>
                Use the Bearer token header: {"\n"}
                Authorization: Bearer YOUR_API_KEY{"\n\n"}
                Base URL: https://api.audioly.app/v1{"\n"}
                Endpoints: /documents, /projects, /audio, /voices
              </Text>
            </Card>

            {keys.map(apiKey => (
              <Card key={apiKey.id} style={styles.keyCard}>
                <View style={styles.keyHeader}>
                  <Text style={[styles.keyName, isDark && styles.darkText]}>{apiKey.name}</Text>
                  <Badge text={apiKey.is_active ? "active" : "revoked"}
                    />
                </View>
                <View style={styles.keyMeta}>
                  <Badge text={apiKey.permissions} />
                  <Text style={[styles.keyDate, isDark && { color: "#64748b" }]}>
                    Created: {apiKey.created_at?.split("T")[0]}
                  </Text>
                </View>
                <Text style={[styles.keyMasked, isDark && { color: "#64748b" }]}>
                  {apiKey.key.substring(0, 8)}{"*".repeat(32)}
                </Text>
                {apiKey.last_used && (
                  <Text style={[styles.lastUsed, isDark && { color: "#64748b" }]}>
                    Last used: {apiKey.last_used}
                  </Text>
                )}
                <View style={styles.keyActions}>
                  {apiKey.is_active ? (
                    <TouchableOpacity style={[styles.keyActionBtn, { borderColor: "#f59e0b" }]}
                      onPress={() => revokeKey(apiKey)}>
                      <Text style={{ color: "#f59e0b", fontWeight: "600", fontSize: 13 }}>Revoke</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={[styles.keyActionBtn, { borderColor: "#ef4444" }]}
                    onPress={() => deleteKey(apiKey)}>
                    <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 13 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
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
  newKeyCard: { marginHorizontal: 16, marginBottom: 12, alignItems: "center" },
  newKeyTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginTop: 8 },
  newKeyWarning: { fontSize: 13, color: "#f59e0b", textAlign: "center", marginVertical: 8 },
  keyDisplay: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 12, width: "100%", gap: 8 },
  keyText: { flex: 1, fontSize: 13, fontFamily: "monospace", color: "#334155" },
  createCard: { marginHorizontal: 16, marginBottom: 12 },
  createTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  input: { height: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  permLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  permRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  permBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center" },
  permText: { fontSize: 13, fontWeight: "500", color: "#333" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  docsCard: { marginBottom: 12, backgroundColor: "#eef2ff" },
  docsTitle: { fontSize: 14, fontWeight: "700", color: "#6366f1", marginBottom: 6 },
  docsText: { fontSize: 12, color: "#64748b", fontFamily: "monospace", lineHeight: 18 },
  keyCard: { marginBottom: 10 },
  keyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  keyName: { fontSize: 16, fontWeight: "600", color: "#111" },
  keyMeta: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 6 },
  keyDate: { fontSize: 12, color: "#94a3b8" },
  keyMasked: { fontSize: 13, fontFamily: "monospace", color: "#64748b", marginBottom: 6 },
  lastUsed: { fontSize: 12, color: "#94a3b8", marginBottom: 6 },
  keyActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  keyActionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  darkText: { color: "#e2e8f0" },
});
