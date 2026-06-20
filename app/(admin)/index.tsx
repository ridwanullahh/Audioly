import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Badge } from "@/components/ui";
import { getDatabase } from "@/db/database";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, documents: 0, projects: 0, audio: 0, clones: 0, conversions24h: 0 });

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const [users, docs, projects, audio, clones] = await Promise.all([
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM users"),
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM documents"),
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM projects"),
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM audio_files"),
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM voice_clones"),
      ]);
      setStats({
        users: users?.count ?? 0,
        documents: docs?.count ?? 0,
        projects: projects?.count ?? 0,
        audio: audio?.count ?? 0,
        clones: clones?.count ?? 0,
        conversions24h: 0,
      });
    })();
  }, []);

  const statCards = [
    { label: "Users", value: stats.users, icon: "people", color: "#3B82F6" },
    { label: "Documents", value: stats.documents, icon: "document-text", color: "#10B981" },
    { label: "Projects", value: stats.projects, icon: "folder", color: "#8B5CF6" },
    { label: "Audio Files", value: stats.audio, icon: "musical-notes", color: "#F59E0B" },
    { label: "Voice Clones", value: stats.clones, icon: "mic", color: "#EF4444" },
    { label: "Conversions (24h)", value: stats.conversions24h, icon: "trending-up", color: "#06B6D4" },
  ];

  const sections = [
    { title: "User Management", icon: "people-outline", desc: "View, suspend, manage users", route: "/(admin)/users" },
    { title: "Conversion Monitor", icon: "analytics-outline", desc: "Queue depth, processing times, failures", route: "/(admin)/analytics" },
    { title: "Voice Library", icon: "mic-outline", desc: "Add, edit, retire system voices", route: "/(tabs)/voices" },
    { title: "Analytics", icon: "bar-chart-outline", desc: "Usage, popular types, top languages", route: "/(admin)/analytics" },
    { title: "API Keys", icon: "key-outline", desc: "Developer and business API key management", route: "/api-keys" },
    { title: "Feature Flags", icon: "toggle-outline", desc: "Enable/disable features per plan", route: "/(admin)/feature-flags" },
    { title: "Audit Log", icon: "list-outline", desc: "Admin action history", route: "/(admin)/analytics" },
    { title: "Blog CMS", icon: "create-outline", desc: "Manage blog posts", route: "/(admin)/blog" },
    { title: "Docs CMS", icon: "book-outline", desc: "Manage documentation", route: "/(admin)/docs" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {statCards.map((s) => (
            <Card key={s.label} className="w-[47%]">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text className="text-xs text-gray-500">{s.label}</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</Text>
            </Card>
          ))}
        </View>

        <Text className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Management</Text>
        <View className="gap-3">
          {sections.map((s) => (
            <TouchableOpacity key={s.title} activeOpacity={0.7} onPress={() => router.push(s.route as any)}>
              <Card>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
                    <Ionicons name={s.icon as any} size={20} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{s.title}</Text>
                    <Text className="text-xs text-gray-500">{s.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
