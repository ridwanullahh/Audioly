import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Badge, ProgressBar, Divider } from "@/components/ui";
import { DocumentService, ProjectService, NotificationService } from "@/services";
import { ConversionPipeline } from "@/services/ai-agent";
import { formatFileSize, formatDuration, getRelativeTime } from "@/lib/utils";
import type { Document, Project } from "@/types";

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [doc, setDoc] = useState<Document | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id || !user) return;
      const document = await DocumentService.getById(id);
      setDoc(document);
      const allProjects = await ProjectService.getByUser(user.id);
      setProjects(allProjects.filter((p: any) => p.document_id === id));
    })();
  }, [id, user]);

  const handleConvert = async () => {
    if (!user || !doc) return;
    setConverting(true);
    try {
      const project = await ProjectService.create({
        userId: user.id,
        name: doc.title,
        documentId: doc.id,
        narrationMode: "straight",
        language: doc.language || "en",
      });
      const pipeline = new ConversionPipeline();
      pipeline.runConversion(project.id, user.id);
      Alert.alert("Conversion Started", `"${doc.title}" is being converted to audio.`);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setConverting(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Document", "Are you sure you want to delete this document?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (doc) { await DocumentService.delete(doc.id); router.back(); }
      }},
    ]);
  };

  if (!doc) return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Text className="text-gray-500">Loading...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1" numberOfLines={1}>{doc.title}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Card className="mt-2 mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
              <Ionicons name="document-text" size={28} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900 dark:text-gray-100 text-lg">{doc.title}</Text>
              <Badge text={(doc as any).status || "uploaded"} variant={(doc as any).status === "parsed" ? "success" : "warning"} />
            </View>
          </View>

          <View className="gap-2">
            {[
              { label: "File", value: (doc as any).original_filename },
              { label: "Type", value: (doc as any).file_type },
              { label: "Size", value: formatFileSize((doc as any).file_size || 0) },
              { label: "Words", value: ((doc as any).word_count || 0).toLocaleString() },
              { label: "Est. Duration", value: formatDuration((doc as any).estimated_duration || 0) },
              { label: "Language", value: (doc as any).language },
              { label: "Doc Type", value: (doc as any).document_type },
              { label: "Uploaded", value: getRelativeTime((doc as any).created_at) },
            ].map((item) => (
              <View key={item.label} className="flex-row justify-between py-1">
                <Text className="text-sm text-gray-500">{item.label}</Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {projects.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Projects ({projects.length})</Text>
            {projects.map((p: any) => (
              <Card key={p.id} className="mb-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</Text>
                    <Text className="text-xs text-gray-500">{p.narration_mode} · {getRelativeTime(p.created_at)}</Text>
                  </View>
                  <Badge text={p.status} variant={p.status === "completed" ? "success" : p.status === "processing" ? "warning" : "info"} />
                </View>
                {p.status === "processing" && <ProgressBar progress={p.progress} className="mt-2" />}
              </Card>
            ))}
          </View>
        )}

        <Button
          title="Convert to Audio"
          onPress={handleConvert}
          loading={converting}
          fullWidth
          size="lg"
          icon={<Ionicons name="headset" size={20} color="#fff" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
