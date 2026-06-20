import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Card, Badge, EmptyState, Divider } from "@/components/ui";
import { NotificationService } from "@/services";
import { getRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadData = async () => {
    if (!user) return;
    const notifs = await NotificationService.getByUser(user.id);
    setNotifications(notifs);
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const markRead = async (id: string) => {
    await NotificationService.markRead(id);
    await loadData();
  };

  const filtered = filter === "unread" ? notifications.filter((n: any) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const iconMap: Record<string, string> = {
    conversion: "headset",
    voice: "mic",
    share: "share",
    system: "information-circle",
    billing: "card",
  };
  const colorMap: Record<string, string> = {
    conversion: "#3B82F6",
    voice: "#8B5CF6",
    share: "#10B981",
    system: "#6B7280",
    billing: "#F59E0B",
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">Notifications</Text>
        {unreadCount > 0 && <Badge text={`${unreadCount} unread`} variant="info" />}
      </View>

      <View className="flex-row px-4 gap-2 mb-2">
        {(["all", "unread"] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            className={`px-4 py-2 rounded-full ${filter === f ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}>
            <Text className={`text-sm font-medium ${filter === f ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>
              {f === "all" ? "All" : `Unread (${unreadCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 40 }}>
        {filtered.length === 0 ? (
          <EmptyState icon="notifications-off-outline" title="No notifications" message="You're all caught up!" />
        ) : (
          <View className="px-4 gap-2">
            {filtered.map((notif: any) => (
              <TouchableOpacity key={notif.id} onPress={() => markRead(notif.id)} activeOpacity={0.7}>
                <Card className={`${!notif.is_read ? "border-l-4 border-l-primary-500" : ""}`}>
                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: (colorMap[notif.type] || "#6B7280") + "20" }}>
                      <Ionicons name={(iconMap[notif.type] || "notifications") as any} size={20} color={colorMap[notif.type] || "#6B7280"} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className={`font-semibold ${!notif.is_read ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>{notif.title}</Text>
                        {!notif.is_read && <View className="w-2 h-2 rounded-full bg-primary-500" />}
                      </View>
                      <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>{notif.message}</Text>
                      <Text className="text-xs text-gray-400 mt-1">{getRelativeTime(notif.created_at)}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
