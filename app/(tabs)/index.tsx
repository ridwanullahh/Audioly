import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { useAppStore } from "@/lib/store/app";
import { Card, Badge, Avatar, SectionHeader, ProgressBar } from "@/components/ui";
import { DocumentService, ProjectService, AudioService, NotificationService, UsageService } from "@/services";
import { getRelativeTime, formatDuration } from "@/lib/utils";
import { NARRATION_MODES } from "@/constants";
import type { Document, Project, AudioFile, Notification as AppNotification, UsageStats } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [recentAudio, setRecentAudio] = useState<AudioFile[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const [docs, projects, audio, count] = await Promise.all([
        DocumentService.getByUser(user.id),
        ProjectService.getByUser(user.id),
        AudioService.getByUser(user.id),
        NotificationService.getUnreadCount(user.id),
      ]);
      setRecentDocs(docs.slice(0, 5));
      setActiveProjects(projects.filter((p: any) => p.status === "processing" || p.status === "draft").slice(0, 3));
      setRecentAudio(audio.slice(0, 5));
      setUnreadCount(count);

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const stats = await UsageService.getStats(user.id, monthStart);
      setUsage(stats);
    } catch (err) {
      console.warn("Load error:", err);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const characterLimit = user?.planId === "business" ? 2000000 : user?.planId === "pro" ? 500000 : 50000;
  const usagePercent = usage ? Math.min(100, (usage.charactersProcessed / characterLimit) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Avatar name={user?.name ?? "U"} size={42} />
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Welcome back, {user?.name?.split(" ")[0]}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {user?.planId === "business" ? "Business" : user?.planId === "pro" ? "Pro" : "Free"} Plan
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/settings")} className="relative">
            <Ionicons name="notifications-outline" size={24} color="#6B7280" />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="px-4 py-3">
          <Card>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Usage</Text>
              <Badge
                text={`${usage?.charactersProcessed?.toLocaleString() ?? 0} / ${characterLimit.toLocaleString()} chars`}
                variant={usagePercent > 90 ? "error" : usagePercent > 70 ? "warning" : "info"}
              />
            </View>
            <ProgressBar progress={usagePercent} height={8} />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-gray-500">{usage?.audioMinutesGenerated ?? 0} min audio</Text>
              <Text className="text-xs text-gray-500">{Math.round(usagePercent)}% used</Text>
            </View>
          </Card>
        </View>

        <View className="px-4 mb-4">
          <TouchableOpacity
            onPress={() => router.push("/document/upload")}
            className="bg-primary-600 rounded-2xl p-5 items-center active:bg-primary-700"
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={36} color="#fff" />
            <Text className="text-white text-lg font-bold mt-2">Upload Document</Text>
            <Text className="text-primary-100 text-sm mt-1">PDF, DOCX, EPUB, TXT, and more</Text>
          </TouchableOpacity>
        </View>

        {activeProjects.length > 0 && (
          <View>
            <SectionHeader title="Active Projects" action={
              <TouchableOpacity onPress={() => router.push("/library?tab=projects")}>
                <Text className="text-primary-500 text-sm font-medium">See all</Text>
              </TouchableOpacity>
            } />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
              {activeProjects.map((p: any) => (
                <TouchableOpacity key={p.id} onPress={() => router.push(`/project/${p.id}`)} activeOpacity={0.8}>
                  <Card className="w-64">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>{p.name}</Text>
                      <Badge text={p.status} variant={p.status === "processing" ? "warning" : "info"} />
                    </View>
                    <ProgressBar progress={p.progress ?? 0} />
                    <Text className="text-xs text-gray-500 mt-1">{Math.round(p.progress ?? 0)}% complete</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {recentDocs.length > 0 && (
          <View>
            <SectionHeader title="Recent Documents" />
            <View className="px-4 gap-3">
              {recentDocs.map((doc: any) => (
                <TouchableOpacity key={doc.id} onPress={() => router.push(`/document/${doc.id}`)} activeOpacity={0.7}>
                  <Card>
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
                        <Ionicons name="document-text" size={20} color="#3B82F6" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>{doc.title}</Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          {doc.word_count?.toLocaleString()} words · {getRelativeTime(doc.created_at)}
                        </Text>
                      </View>
                      <Badge text={doc.status} variant={doc.status === "parsed" ? "success" : doc.status === "error" ? "error" : "warning"} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {recentAudio.length > 0 && (
          <View>
            <SectionHeader title="Recent Audio" />
            <View className="px-4 gap-3">
              {recentAudio.map((audio: any) => (
                <TouchableOpacity key={audio.id} activeOpacity={0.7}>
                  <Card>
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 items-center justify-center">
                        <Ionicons name="musical-notes" size={20} color="#8B5CF6" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>{audio.filename}</Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDuration(audio.duration)} · {audio.format?.toUpperCase()} · {audio.quality}
                        </Text>
                      </View>
                      <Ionicons name="play-circle" size={32} color="#3B82F6" />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View className="px-4 pt-4">
          <SectionHeader title="Quick Actions" />
          <View className="flex-row flex-wrap gap-3">
            {[
              { icon: "add-circle-outline", label: "New Project", route: "/project/new", color: "#3B82F6" },
              { icon: "mic-outline", label: "Voice Cloning", route: "/voice/clone", color: "#8B5CF6" },
              { icon: "list-outline", label: "Playlists", route: "/library?tab=playlists", color: "#10B981" },
              { icon: "share-outline", label: "Shared", route: "/library?tab=shared", color: "#F59E0B" },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route as any)}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 items-center w-[47%] border border-gray-100 dark:border-gray-700"
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon as any} size={28} color={action.color} />
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
