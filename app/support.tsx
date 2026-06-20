import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/lib/store/app";
import { useAuthStore } from "@/lib/store/auth";
import { getDatabase } from "@/db/database";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  response: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
  closed: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

export default function SupportScreen() {
  const router = useRouter();
  const { theme } = useAppStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<Ticket>(
      "SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC",
      [user?.id ?? "default"]
    );
    setTickets(result as Ticket[]);
  };

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Error", "Subject and message are required");
      return;
    }
    setLoading(true);
    try {
      const db = await getDatabase();
      const id = `ticket_${Date.now()}`;
      await db.runAsync(
        "INSERT INTO support_tickets (id, user_id, subject, message, status, priority) VALUES (?, ?, ?, ?, 'open', ?)",
        [id, user?.id ?? "default", subject.trim(), message.trim(), priority]
      );
      setSubject("");
      setMessage("");
      setPriority("medium");
      setShowNew(false);
      loadTickets();
      Alert.alert("Success", "Support ticket created");
    } catch {
      Alert.alert("Error", "Failed to create ticket");
    }
    setLoading(false);
  };

  const closeTicket = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE support_tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ?", [id]);
    setSelectedTicket(null);
    loadTickets();
  };

  const formatDate = (d: string) => {
    try { return new Date(d + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Support</Text>
        <TouchableOpacity onPress={() => setShowNew(!showNew)}>
          <Ionicons name={showNew ? "close" : "add"} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {showNew && (
        <Card style={styles.newCard}>
          <Text style={[styles.newTitle, isDark && styles.darkText]}>New Support Ticket</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Subject"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={subject}
            onChangeText={setSubject}
          />
          <TextInput
            style={[styles.textArea, isDark && styles.darkInput]}
            placeholder="Describe your issue..."
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={[styles.priorityLabel, isDark && styles.darkText]}>Priority</Text>
          <View style={styles.priorityRow}>
            {["low", "medium", "high", "critical"].map(p => (
              <TouchableOpacity key={p} style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p] }]}
                onPress={() => setPriority(p)}>
                <Text style={[styles.priorityText, priority === p && { color: "#fff" }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="Submit Ticket" onPress={createTicket} loading={loading} fullWidth />
        </Card>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tickets.length === 0 ? (
          <EmptyState icon="help-circle-outline" title="No tickets"
            message="Create a support ticket if you need help" />
        ) : (
          tickets.map(ticket => (
            <TouchableOpacity key={ticket.id} style={[styles.ticketCard, isDark && styles.darkTicketCard]}
              onPress={() => setSelectedTicket(ticket)}>
              <View style={styles.ticketHeader}>
                <Text style={[styles.ticketSubject, isDark && styles.darkText]} numberOfLines={1}>{ticket.subject}</Text>
                <Badge text={ticket.status} />
              </View>
              <Text style={[styles.ticketMsg, isDark && { color: "#94a3b8" }]} numberOfLines={2}>{ticket.message}</Text>
              <View style={styles.ticketFooter}>
                <Badge text={ticket.priority} />
                <Text style={[styles.ticketDate, isDark && { color: "#64748b" }]}>{formatDate(ticket.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedTicket && (
        <View style={styles.modal}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Card>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDark && styles.darkText]}>{selectedTicket.subject}</Text>
                <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                  <Ionicons name="close" size={24} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBadges}>
                <Badge text={selectedTicket.status} />
                <Badge text={selectedTicket.priority} />
                <Text style={[styles.modalDate, isDark && { color: "#94a3b8" }]}>{formatDate(selectedTicket.created_at)}</Text>
              </View>
              <View style={styles.msgBox}>
                <Text style={[styles.msgLabel, isDark && styles.darkText]}>Your Message</Text>
                <Text style={[styles.msgText, isDark && { color: "#cbd5e1" }]}>{selectedTicket.message}</Text>
              </View>
              {selectedTicket.response && (
                <View style={[styles.msgBox, { backgroundColor: isDark ? "#1e3a5f" : "#eff6ff" }]}>
                  <Text style={[styles.msgLabel, isDark && styles.darkText]}>Support Response</Text>
                  <Text style={[styles.msgText, isDark && { color: "#cbd5e1" }]}>{selectedTicket.response}</Text>
                </View>
              )}
              {selectedTicket.status !== "closed" && (
                <Button title="Close Ticket" variant="outline" onPress={() => closeTicket(selectedTicket.id)} />
              )}
            </Card>
          </ScrollView>
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
  newCard: { marginHorizontal: 16, marginBottom: 12 },
  newTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  input: { height: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  darkInput: { backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" },
  textArea: { height: 100, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111", backgroundColor: "#fff", marginBottom: 8 },
  priorityLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  priorityRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  priorityBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f1f5f9" },
  priorityText: { fontSize: 13, fontWeight: "500", color: "#333", textTransform: "capitalize" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  ticketCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  darkTicketCard: { backgroundColor: "#1e293b" },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ticketSubject: { fontSize: 15, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  ticketMsg: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketDate: { fontSize: 12, color: "#94a3b8" },
  modal: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center" },
  modalScroll: { flex: 1, padding: 16 },
  modalContent: { paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", flex: 1 },
  modalBadges: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 16 },
  modalDate: { fontSize: 12, color: "#94a3b8" },
  msgBox: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 12 },
  msgLabel: { fontSize: 12, fontWeight: "700", color: "#6366f1", marginBottom: 4, textTransform: "uppercase" },
  msgText: { fontSize: 14, color: "#334155", lineHeight: 20 },
  darkText: { color: "#e2e8f0" },
});
