import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Badge, Divider, Input } from "@/components/ui";
import { ProjectService, VoiceService, DocumentService } from "@/services";
import { ConversionPipeline } from "@/services/ai-agent";
import { formatDuration } from "@/lib/utils";
import { NARRATION_MODES } from "@/constants";
import type { Project, Voice, Document, NarrationSection } from "@/types";

export default function NarrationReviewScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [sections, setSections] = useState<NarrationSection[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!projectId || !user) return;
      const [proj, vs] = await Promise.all([ProjectService.getById(projectId), VoiceService.getAll()]);
      setProject(proj);
      setVoices(vs);
      if (proj?.documentId) {
        const document = await DocumentService.getById(proj.documentId);
        setDoc(document);
        const plan = (proj as any).narration_plan ? JSON.parse((proj as any).narration_plan) : null;
        if (plan?.sections) {
          setSections(plan.sections);
        } else if (document) {
          setSections([{
            id: "main",
            chapterId: "main",
            title: document.title,
            voiceId: proj.voiceId || vs[0]?.id || "",
            estimatedDuration: document.estimatedDuration || 300,
            pace: "normal",
            skip: false,
          }]);
        }
      }
    })();
  }, [projectId, user]);

  const toggleSection = (id: string) => {
    setSections(sections.map((s) => s.id === id ? { ...s, skip: !s.skip } : s));
  };

  const setSectionVoice = (id: string, voiceId: string) => {
    setSections(sections.map((s) => s.id === id ? { ...s, voiceId } : s));
  };

  const setSectionPace = (id: string, pace: "slow" | "normal" | "fast") => {
    setSections(sections.map((s) => s.id === id ? { ...s, pace } : s));
  };

  const startConversion = async () => {
    if (!user || !project) return;
    setStarting(true);
    try {
      const pipeline = new ConversionPipeline();
      pipeline.runConversion(project.id, user.id);
      Alert.alert("Conversion Started", "Your narration is being generated. You'll be notified when it's ready.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setStarting(false);
  };

  const totalDuration = sections.filter((s) => !s.skip).reduce((sum, s) => sum + s.estimatedDuration, 0);
  const activeCount = sections.filter((s) => !s.skip).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Review Narration Plan</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Card className="mt-2 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-gray-900 dark:text-gray-100">{project?.name}</Text>
            <Badge text={NARRATION_MODES.find((m) => m.value === (project as any)?.narration_mode)?.label || "Straight"} variant="info" />
          </View>
          <View className="flex-row gap-6">
            <View>
              <Text className="text-xs text-gray-500">Sections</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{activeCount}/{sections.length}</Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500">Est. Duration</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatDuration(totalDuration)}</Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500">Format</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{(project as any)?.output_format?.toUpperCase()}</Text>
            </View>
          </View>
        </Card>

        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Sections</Text>
        <View className="gap-3">
          {sections.map((section) => (
            <Card key={section.id} className={section.skip ? "opacity-50" : ""}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <TouchableOpacity onPress={() => toggleSection(section.id)}>
                    <Ionicons name={section.skip ? "checkbox-outline" : "checkbox"} size={24} color={section.skip ? "#9CA3AF" : "#3B82F6"} />
                  </TouchableOpacity>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100 flex-1" numberOfLines={1}>{section.title}</Text>
                </View>
                <Text className="text-sm text-gray-500">{formatDuration(section.estimatedDuration)}</Text>
              </View>

              <View className="flex-row gap-2 mt-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Voice</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                    {voices.slice(0, 8).map((v: any) => (
                      <TouchableOpacity key={v.id} onPress={() => setSectionVoice(section.id, v.id)}
                        className={`px-2 py-1 rounded ${section.voiceId === v.id ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}>
                        <Text className={`text-xs ${section.voiceId === v.id ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>{v.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View>
                  <Text className="text-xs text-gray-500 mb-1">Pace</Text>
                  <View className="flex-row gap-1">
                    {(["slow", "normal", "fast"] as const).map((p) => (
                      <TouchableOpacity key={p} onPress={() => setSectionPace(section.id, p)}
                        className={`px-2 py-1 rounded ${section.pace === p ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}>
                        <Text className={`text-xs ${section.pace === p ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>

        <Divider className="my-4" />

        <Button title="Start Narration" onPress={startConversion} loading={starting} fullWidth size="lg" icon={<Ionicons name="play-circle" size={20} color="#fff" />} />
      </ScrollView>
    </SafeAreaView>
  );
}
