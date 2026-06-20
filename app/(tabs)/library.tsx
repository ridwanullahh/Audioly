import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { usePlayerStore } from "@/lib/store/player";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { AudioService, ProjectService, PlaylistService } from "@/services";
import { formatDuration, formatFileSize, getRelativeTime } from "@/lib/utils";
import type { AudioFile, Project, Playlist } from "@/types";

type Tab = "audio" | "projects" | "playlists";

export default function LibraryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const playerStore = usePlayerStore();
  const [activeTab, setActiveTab] = useState<Tab>("audio");
  const [refreshing, setRefreshing] = useState(false);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    if (!user) return;
    const [audio, projs, pls] = await Promise.all([
      AudioService.getByUser(user.id),
      ProjectService.getByUser(user.id),
      PlaylistService.getByUser(user.id),
    ]);
    setAudioFiles(audio);
    setProjects(projs);
    setPlaylists(pls);
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const filteredAudio = audioFiles.filter((a: any) =>
    !searchQuery || a.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "audio", label: "Audio", count: audioFiles.length },
    { key: "projects", label: "Projects", count: projects.length },
    { key: "playlists", label: "Playlists", count: playlists.length },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Library</Text>
        <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab.key ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
            >
              <Text className={`text-sm font-medium ${activeTab === tab.key ? "text-primary-600" : "text-gray-500 dark:text-gray-400"}`}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === "audio" && (
          filteredAudio.length === 0 ? (
            <EmptyState icon="musical-notes-outline" title="No audio yet" message="Upload a document and convert it to audio to get started." action={
              <TouchableOpacity onPress={() => router.push("/document/upload")} className="bg-primary-600 px-6 py-3 rounded-xl">
                <Text className="text-white font-semibold">Upload Document</Text>
              </TouchableOpacity>
            } />
          ) : (
            <View className="px-4 gap-3 pt-2">
              {filteredAudio.map((audio: any) => (
                <TouchableOpacity key={audio.id} onPress={() => playerStore.play(audio)} activeOpacity={0.7}>
                  <Card>
                    <View className="flex-row items-center gap-3">
                      <View className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 items-center justify-center">
                        <Ionicons name="play" size={20} color="#8B5CF6" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>{audio.filename}</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {formatDuration(audio.duration)} · {audio.format?.toUpperCase()} · {audio.quality} · {formatFileSize(audio.file_size)}
                        </Text>
                      </View>
                      <TouchableOpacity>
                        <Ionicons name="download-outline" size={22} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {activeTab === "projects" && (
          projects.length === 0 ? (
            <EmptyState icon="folder-open-outline" title="No projects" message="Create a project to convert documents to audio." />
          ) : (
            <View className="px-4 gap-3 pt-2">
              {projects.map((project: any) => (
                <TouchableOpacity key={project.id} onPress={() => router.push(`/project/${project.id}` as any)} activeOpacity={0.7}>
                  <Card>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-semibold text-gray-900 dark:text-gray-100 flex-1" numberOfLines={1}>{project.name}</Text>
                      <Badge
                        text={project.status}
                        variant={project.status === "completed" ? "success" : project.status === "processing" ? "warning" : project.status === "error" ? "error" : "info"}
                      />
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs text-gray-500">{project.narration_mode} · {getRelativeTime(project.created_at)}</Text>
                      {project.status === "processing" && (
                        <Text className="text-xs text-primary-500 font-medium">{Math.round(project.progress)}%</Text>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {activeTab === "playlists" && (
          playlists.length === 0 ? (
            <EmptyState icon="list-outline" title="No playlists" message="Create playlists to organize your audio." />
          ) : (
            <View className="px-4 gap-3 pt-2">
              {playlists.map((pl: any) => (
                <TouchableOpacity key={pl.id} activeOpacity={0.7}>
                  <Card>
                    <View className="flex-row items-center gap-3">
                      <View className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center">
                        <Ionicons name="list" size={20} color="#10B981" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900 dark:text-gray-100">{pl.name}</Text>
                        <Text className="text-xs text-gray-500">{JSON.parse(pl.audio_ids || "[]").length} tracks</Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
