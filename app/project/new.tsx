import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Input, Badge, Divider } from "@/components/ui";
import { DocumentService, ProjectService, VoiceService, NotificationService } from "@/services";
import { ConversionPipeline } from "@/services/ai-agent";
import { NARRATION_MODES, OUTPUT_FORMATS, QUALITY_OPTIONS, LANGUAGES } from "@/constants";
import type { Document, Voice, NarrationMode, AudioFormat, AudioQuality } from "@/types";

export default function NewProjectScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [name, setName] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [narrationMode, setNarrationMode] = useState<NarrationMode>("straight");
  const [outputFormat, setOutputFormat] = useState<AudioFormat>("mp3");
  const [quality, setQuality] = useState<AudioQuality>("128kbps");
  const [language, setLanguage] = useState("en-US");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [docs, vs] = await Promise.all([DocumentService.getByUser(user.id), VoiceService.getAll()]);
      setDocuments(docs.filter((d: any) => d.status === "parsed" || d.status === "uploaded"));
      setVoices(vs);
      if (vs.length > 0) setSelectedVoiceId(vs[0].id);
    })();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !name || !selectedDocId) {
      Alert.alert("Missing Info", "Please provide a name and select a document.");
      return;
    }
    setCreating(true);
    try {
      const project = await ProjectService.create({
        userId: user.id,
        name,
        documentId: selectedDocId,
        narrationMode,
        voiceId: selectedVoiceId,
        language,
        outputFormat,
        quality,
      });

      await NotificationService.create({
        userId: user.id,
        title: "Project Created",
        message: `"${name}" is ready. Start conversion when you're ready.`,
        type: "conversion",
      });

      Alert.alert("Project Created", "Your project has been created successfully.", [
        { text: "Start Conversion", onPress: () => startConversion(project.id) },
        { text: "Later", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setCreating(false);
  };

  const startConversion = async (projectId: string) => {
    if (!user) return;
    try {
      const pipeline = new ConversionPipeline();
      pipeline.runConversion(projectId, user.id);
      router.back();
    } catch (err: any) {
      Alert.alert("Conversion Error", err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">New Project</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="gap-4 mt-2">
          <Input label="Project Name" value={name} onChangeText={setName} placeholder="My Audiobook" />

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Document</Text>
            {documents.length === 0 ? (
              <Card>
                <Text className="text-sm text-gray-500 text-center py-4">No documents found. Upload one first.</Text>
                <Button title="Upload Document" onPress={() => router.push("/document/upload")} variant="outline" />
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {documents.map((doc: any) => (
                  <TouchableOpacity
                    key={doc.id}
                    onPress={() => setSelectedDocId(doc.id)}
                    className={`w-44 p-3 rounded-xl border-2 ${selectedDocId === doc.id ? "border-primary-500 bg-primary-50 dark:bg-primary-950" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}
                  >
                    <Ionicons name="document-text" size={24} color={selectedDocId === doc.id ? "#3B82F6" : "#9CA3AF"} />
                    <Text className="font-medium text-sm mt-2 text-gray-900 dark:text-gray-100" numberOfLines={2}>{doc.title}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{doc.word_count?.toLocaleString()} words</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Divider />

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Narration Mode</Text>
            <View className="flex-row flex-wrap gap-2">
              {NARRATION_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  onPress={() => setNarrationMode(mode.value as NarrationMode)}
                  className={`flex-row items-center px-3 py-2 rounded-lg gap-1.5 ${narrationMode === mode.value ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  <Ionicons name={mode.icon as any} size={14} color={narrationMode === mode.value ? "#fff" : "#6B7280"} />
                  <Text className={`text-xs font-medium ${narrationMode === mode.value ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{mode.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Voice</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {voices.slice(0, 12).map((voice: any) => (
                <TouchableOpacity
                  key={voice.id}
                  onPress={() => setSelectedVoiceId(voice.id)}
                  className={`px-4 py-2.5 rounded-xl items-center min-w-[100px] ${selectedVoiceId === voice.id ? "bg-primary-500" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}`}
                >
                  <Text className={`text-sm font-semibold ${selectedVoiceId === voice.id ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>{voice.name}</Text>
                  <Text className={`text-xs ${selectedVoiceId === voice.id ? "text-primary-100" : "text-gray-500"}`}>{voice.language}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Output Format</Text>
            <View className="flex-row flex-wrap gap-2">
              {OUTPUT_FORMATS.map((fmt) => (
                <TouchableOpacity
                  key={fmt.value}
                  onPress={() => setOutputFormat(fmt.value as AudioFormat)}
                  className={`px-4 py-2 rounded-lg ${outputFormat === fmt.value ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  <Text className={`text-sm font-medium ${outputFormat === fmt.value ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{fmt.label}</Text>
                  <Text className={`text-xs ${outputFormat === fmt.value ? "text-primary-100" : "text-gray-500"}`}>{fmt.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quality</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUALITY_OPTIONS.map((q) => (
                <TouchableOpacity
                  key={q.value}
                  onPress={() => setQuality(q.value as AudioQuality)}
                  className={`px-4 py-2 rounded-lg ${quality === q.value ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  <Text className={`text-sm font-medium ${quality === q.value ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button title="Create Project" onPress={handleCreate} loading={creating} fullWidth size="lg" icon={<Ionicons name="add-circle" size={20} color="#fff" />} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
