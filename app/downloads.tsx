import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import { Card, Button, Badge, EmptyState, ProgressBar, Divider } from "@/components/ui";
import { AudioService } from "@/services";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/lib/store/player";
import type { AudioFile } from "@/types";

interface DownloadItem {
  audio: AudioFile;
  status: "queued" | "downloading" | "completed" | "error";
  progress: number;
  localPath?: string;
  fileSize: number;
}

export default function DownloadsScreen() {
  const router = useRouter();
  const store = usePlayerStore();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [availableAudio, setAvailableAudio] = useState<AudioFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  const loadData = useCallback(async () => {
    const allAudio = await AudioService.getAll();
    setAvailableAudio(allAudio);

    const downloaded = allAudio.filter((a) => a.isDownloaded);
    setDownloads(downloaded.map((a) => ({
      audio: a,
      status: "completed" as const,
      progress: 100,
      localPath: a.filePath,
      fileSize: a.fileSize,
    })));

    const total = downloaded.reduce((sum, a) => sum + a.fileSize, 0);
    setTotalSize(total);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const downloadAudio = async (audio: AudioFile) => {
    const existing = downloads.find((d) => d.audio.id === audio.id);
    if (existing) return;

    const newItem: DownloadItem = {
      audio,
      status: "downloading",
      progress: 0,
      fileSize: audio.fileSize,
    };
    setDownloads((prev) => [newItem, ...prev]);

    try {
      const dir = `${FileSystem.documentDirectory}offline_audio/`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      const localPath = `${dir}${audio.id}.${audio.format}`;

      for (let p = 0; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 200));
        setDownloads((prev) =>
          prev.map((d) => d.audio.id === audio.id ? { ...d, progress: p } : d)
        );
      }

      await AudioService.update(audio.id, { isDownloaded: true, filePath: localPath } as any);

      setDownloads((prev) =>
        prev.map((d) => d.audio.id === audio.id ? { ...d, status: "completed", progress: 100, localPath } : d)
      );
      setTotalSize((prev) => prev + audio.fileSize);
    } catch (err: any) {
      setDownloads((prev) =>
        prev.map((d) => d.audio.id === audio.id ? { ...d, status: "error" } : d)
      );
    }
  };

  const removeDownload = async (id: string) => {
    Alert.alert("Remove Download", "Delete the offline file? The audio will remain in your library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const item = downloads.find((d) => d.audio.id === id);
          if (item?.localPath) {
            try { await FileSystem.deleteAsync(item.localPath); } catch {}
          }
          await AudioService.update(id, { isDownloaded: false } as any);
          setDownloads((prev) => prev.filter((d) => d.audio.id !== id));
          if (item) setTotalSize((prev) => Math.max(0, prev - item.fileSize));
        },
      },
    ]);
  };

  const downloadAll = async () => {
    const notDownloaded = availableAudio.filter((a) => !downloads.some((d) => d.audio.id === a.id));
    if (notDownloaded.length === 0) {
      Alert.alert("All Downloaded", "All audio files are already available offline.");
      return;
    }
    for (const audio of notDownloaded) {
      await downloadAudio(audio);
    }
  };

  const removeAll = () => {
    Alert.alert("Remove All Downloads", "This will delete all offline audio files. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove All",
        style: "destructive",
        onPress: async () => {
          for (const item of downloads) {
            if (item.localPath) {
              try { await FileSystem.deleteAsync(item.localPath); } catch {}
            }
          }
          setDownloads([]);
          setTotalSize(0);
        },
      },
    ]);
  };

  const playAudio = (audio: AudioFile) => {
    store.play(audio);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">Downloads</Text>
        {downloads.length > 0 && (
          <TouchableOpacity onPress={removeAll}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <Card className="mx-4 mb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-gray-500">Storage Used</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatSize(totalSize)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm text-gray-500">Offline Files</Text>
            <Text className="text-2xl font-bold text-primary-600">{downloads.filter((d) => d.status === "completed").length}</Text>
          </View>
        </View>
      </Card>

      {availableAudio.filter((a) => !downloads.some((d) => d.audio.id === a.id)).length > 0 && (
        <View className="px-4 mb-4">
          <Button
            title={`Download All (${availableAudio.filter((a) => !downloads.some((d) => d.audio.id === a.id)).length} remaining)`}
            onPress={downloadAll}
            fullWidth
            variant="outline"
            icon={<Ionicons name="cloud-download-outline" size={18} color="#3B82F6" />}
          />
        </View>
      )}

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>

        {downloads.length === 0 && availableAudio.length === 0 ? (
          <EmptyState icon="cloud-download-outline" title="No Audio Files" message="Convert documents to audio first, then download them for offline listening." />
        ) : (
          <>
            {downloads.map((item) => (
              <Card key={item.audio.id} className="mb-3">
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity onPress={() => item.status === "completed" && playAudio(item.audio)}
                    className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center">
                    <Ionicons
                      name={item.status === "completed" ? "play" : item.status === "downloading" ? "cloud-download" : item.status === "error" ? "warning" : "time"}
                      size={20}
                      color={item.status === "completed" ? "#3B82F6" : item.status === "error" ? "#EF4444" : "#6B7280"}
                    />
                  </TouchableOpacity>

                  <View className="flex-1 min-w-0">
                    <Text className="font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>{item.audio.filename}</Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className="text-xs text-gray-500">{formatDuration(item.audio.duration)}</Text>
                      <Text className="text-xs text-gray-400">·</Text>
                      <Text className="text-xs text-gray-500">{formatSize(item.fileSize)}</Text>
                    </View>

                    {item.status === "downloading" && (
                      <View className="mt-2">
                        <ProgressBar progress={item.progress} height={3} />
                        <Text className="text-xs text-gray-400 mt-0.5">{item.progress}%</Text>
                      </View>
                    )}
                  </View>

                  <View className="items-end gap-2">
                    <Badge
                      text={item.status}
                      variant={item.status === "completed" ? "success" : item.status === "error" ? "error" : "info"}
                    />
                    {item.status === "completed" && (
                      <TouchableOpacity onPress={() => removeDownload(item.audio.id)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}

            {availableAudio.filter((a) => !downloads.some((d) => d.audio.id === a.id)).length > 0 && (
              <>
                <Text className="text-sm font-semibold text-gray-500 mt-4 mb-2">Available for Download</Text>
                {availableAudio.filter((a) => !downloads.some((d) => d.audio.id === a.id)).map((audio) => (
                  <Card key={audio.id} className="mb-3">
                    <View className="flex-row items-center gap-3">
                      <View className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 items-center justify-center">
                        <Ionicons name="musical-notes" size={20} color="#9CA3AF" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>{audio.filename}</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text className="text-xs text-gray-500">{formatDuration(audio.duration)}</Text>
                          <Text className="text-xs text-gray-400">·</Text>
                          <Text className="text-xs text-gray-500">{formatSize(audio.fileSize)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => downloadAudio(audio)}
                        className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 items-center justify-center">
                        <Ionicons name="download-outline" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
