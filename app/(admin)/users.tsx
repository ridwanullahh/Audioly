import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { getDatabase } from "@/db/database";
import { Card, Badge, EmptyState } from "@/components/ui";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
  plan_id: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#dc2626",
  business: "#8b5cf6",
  pro: "#3b82f6",
  free: "#6b7280",
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<User>(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    setUsers(result as User[]);
  };

  const toggleUserActive = async (user: User) => {
    const action = user.is_active ? "suspend" : "reactivate";
    Alert.alert("Confirm", `${action} ${user.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("UPDATE users SET is_active = ? WHERE id = ?", [user.is_active ? 0 : 1, user.id]);
        setSelectedUser(null);
        loadUsers();
      }},
    ]);
  };

  const changeRole = async (user: User, newRole: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE users SET role = ? WHERE id = ?", [newRole, user.id]);
    setSelectedUser(null);
    loadUsers();
  };

  const deleteUser = (user: User) => {
    Alert.alert("Delete User", `Permanently delete ${user.name} and all their data?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM users WHERE id = ?", [user.id]);
        setSelectedUser(null);
        loadUsers();
      }},
    ]);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    pro: users.filter(u => u.role === "pro").length,
    business: users.filter(u => u.role === "business").length,
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>User Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Total", value: stats.total, color: "#6366f1" },
          { label: "Active", value: stats.active, color: "#22c55e" },
          { label: "Pro", value: stats.pro, color: "#3b82f6" },
          { label: "Business", value: stats.business, color: "#8b5cf6" },
        ].map(s => (
          <View key={s.label} style={[styles.statBox, isDark && styles.darkStatBox]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, isDark && { color: "#94a3b8" }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} style={{ paddingLeft: 12 }} />
        <TextInput style={[styles.searchInput, isDark && styles.darkInput]} placeholder="Search users..."
          placeholderTextColor={isDark ? "#666" : "#999"} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {["all", "free", "pro", "business", "admin"].map(r => (
          <TouchableOpacity key={r} style={[styles.filterBtn, filterRole === r && { backgroundColor: "#6366f1" }]}
            onPress={() => setFilterRole(r)}>
            <Text style={[styles.filterText, filterRole === r && { color: "#fff" }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <EmptyState icon="people-outline" title="No users found" message="" />
        ) : (
          filtered.map(user => (
            <TouchableOpacity key={user.id} style={[styles.userCard, isDark && styles.darkCard]}
              onPress={() => setSelectedUser(user)}>
              <View style={styles.userLeft}>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[user.role] ?? "#6b7280" }]}>
                  <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[styles.userName, isDark && styles.darkText]}>{user.name}</Text>
                  <Text style={[styles.userEmail, isDark && { color: "#94a3b8" }]}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.userRight}>
                <Badge text={user.role} />
                {!user.is_active ? <Badge text="suspended" variant="error" /> : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedUser && (
        <View style={styles.modal}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>{selectedUser.name}</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.detailLabel, isDark && { color: "#94a3b8" }]}>Email: {selectedUser.email}</Text>
            <Text style={[styles.detailLabel, isDark && { color: "#94a3b8" }]}>Role: {selectedUser.role}</Text>
            <Text style={[styles.detailLabel, isDark && { color: "#94a3b8" }]}>Status: {selectedUser.is_active ? "Active" : "Suspended"}</Text>
            <Text style={[styles.detailLabel, isDark && { color: "#94a3b8" }]}>Joined: {selectedUser.created_at}</Text>

            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Change Role</Text>
            <View style={styles.roleRow}>
              {["free", "pro", "business", "admin"].map(r => (
                <TouchableOpacity key={r} style={[styles.roleBtn, selectedUser.role === r && { backgroundColor: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] }]}
                  onPress={() => changeRole(selectedUser, r)}>
                  <Text style={[styles.roleText, selectedUser.role === r && { color: "#fff" }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: "#f59e0b" }]}
                onPress={() => toggleUserActive(selectedUser)}>
                <Text style={{ color: "#f59e0b", fontWeight: "600" }}>
                  {selectedUser.is_active ? "Suspend" : "Reactivate"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: "#ef4444" }]}
                onPress={() => deleteUser(selectedUser)}>
                <Text style={{ color: "#ef4444", fontWeight: "600" }}>Delete</Text>
              </TouchableOpacity>
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
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 10, alignItems: "center" },
  darkStatBox: { backgroundColor: "#1e293b" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10 },
  searchInput: { flex: 1, height: 40, paddingHorizontal: 8, fontSize: 14, color: "#111" },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  filterRow: { maxHeight: 44, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f1f5f9" },
  filterText: { fontSize: 13, fontWeight: "500", color: "#333", textTransform: "capitalize" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  userCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8 },
  darkCard: { backgroundColor: "#1e293b" },
  userLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  userName: { fontSize: 15, fontWeight: "600", color: "#111" },
  userEmail: { fontSize: 12, color: "#64748b" },
  userRight: { flexDirection: "row", gap: 4 },
  modal: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  detailLabel: { fontSize: 14, color: "#64748b", marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginTop: 12, marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  roleText: { fontSize: 13, fontWeight: "500", color: "#333", textTransform: "capitalize" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  darkText: { color: "#e2e8f0" },
});
