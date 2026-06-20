import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Badge, ProgressBar, Divider } from "@/components/ui";
import { ProjectService, AudioService, DocumentService } from "@/services";
import { ConversionPipeline } from "@/services/ai-agent";
import { formatDuration, getRelativeTime } from "@/lib/utils";
import type { Project, AudioFile, Document } from "@/types";

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id || !user) return;
      const proj = await ProjectService.getById(id);
      setProject(proj);
      if (proj) {
        const [audio, document] = await Promise.all([
          AudioService.getByProject(proj.id),
          proj.documentId ? DocumentService.getById(proj.documentId) : Promise.resolve(null),
        ]);
        setAudioFiles(audio);
        setDoc(document);
      }
    })();
  }, [id, user]);

  const startConversion = async () => {
    if (!user || !project) return;
    setConverting(true);
    try {
      const pipeline = new ConversionPipeline();
      await pipeline.runConversion(project.id, user.id);
      const updated = await ProjectService.getById(project.id);
      setProject(updated);
      const audio = await AudioService.getByProject(project.id);
      setAudioFiles(audio);
      Alert.alert("Complete", "Conversion finished successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Conversion failed");
      const updated = await ProjectService.getById(project.id);
      setProject(updated);
    }
    setConverting(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Project", "This will permanently delete this project.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (project) { await ProjectService.delete(project.id); router.back(); }
      }},
    ]);
  };

  if (!project) return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Text className="text-gray-500">Loading project...</Text>
    </SafeAreaView>
  );

  const statusColor = (project as any).status === "completed" ? "success" : (project as any).status === "processing" ? "warning" : (project as any).status === "error" ? "error" : "info";

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1" numberOfLines={1}>{project.name}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Card className="mt-2 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Badge text={(project as any).status} variant={statusColor as any} />
            <Text className="text-sm text-gray-500">{getRelativeTime((project as any).created_at)}</Text>
          </View>

          {(project as any).status === "processing" && (
            <View className="mb-3">
              <ProgressBar progress={(project as any).progress ?? 0} height={8} />
              <Text className="text-center text-sm text-primary-500 mt-1">{Math.round((project as any).progress ?? 0)}%</Text>
            </View>
          )}

          <View className="gap-2">
            {[
              { label: "Mode", value: (project as any).narration_mode },
              { label: "Format", value: (project as any).output_format?.toUpperCase() },
              { label: "Quality", value: (project as any).quality },
              { label: "Language", value: (project as any).language },
            ].map((item) => (
              <View key={item.label} className="flex-row justify-between py-1">
                <Text className="text-sm text-gray-500">{item.label}</Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {doc && (
          <Card className="mb-4">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Source Document</Text>
            <TouchableOpacity onPress={() => router.push(`/document/${doc.id}`)} className="flex-row items-center gap-3">
              <Ionicons name="document-text" size={24} color="#3B82F6" />
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-gray-100">{doc.title}</Text>
                <Text className="text-xs text-gray-500">{(doc as any).word_count?.toLocaleString()} words</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </Card>
        )}

        {audioFiles.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Audio Output ({audioFiles.length})</Text>
            {audioFiles.map((audio: any) => (
              <Card key={audio.id} className="mb-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 items-center justify-center">
                    <Ionicons name="musical-notes" size={20} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{audio.filename}</Text>
                    <Text className="text-xs text-gray-500">{formatDuration(audio.duration)} · {audio.format?.toUpperCase()} · {audio.quality}</Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="download-outline" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {(project as any).status === "draft" && (
          <Button
            title="Start Conversion"
            onPress={startConversion}
            loading={converting}
            fullWidth
            size="lg"
            icon={<Ionicons name="play-circle" size={20} color="#fff" />}
          />
        )}

        {(project as any).status === "error" && (
          <Button
            title="Retry Conversion"
            onPress={startConversion}
            loading={converting}
            variant="danger"
            fullWidth
            size="lg"
            icon={<Ionicons name="refresh" size={20} color="#fff" />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
