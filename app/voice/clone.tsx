import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Input, Badge, ProgressBar } from "@/components/ui";
import { VoiceCloneService, NotificationService } from "@/services";

export default function VoiceCloneScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [cloneName, setCloneName] = useState("");
  const [samples, setSamples] = useState<any[]>([]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [language, setLanguage] = useState("en");
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"info" | "upload" | "consent" | "processing">("info");

  const pickSample = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/x-m4a"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setSamples([...samples, ...result.assets]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick audio files");
    }
  };

  const handleCreate = async () => {
    if (!user || !cloneName || samples.length === 0 || !consentGiven) {
      Alert.alert("Missing Info", "Please provide a name, upload samples, and accept the consent declaration.");
      return;
    }
    setCreating(true);
    setStep("processing");
    try {
      await VoiceCloneService.create({
        userId: user.id,
        name: cloneName,
        language,
        consentGiven: true,
        sampleCount: samples.length,
      });
      await NotificationService.create({
        userId: user.id,
        title: "Voice Clone Started",
        message: `Training "${cloneName}" with ${samples.length} sample(s). This may take a few minutes.`,
        type: "voice",
      });
      Alert.alert("Success", "Voice clone training has started. You'll be notified when it's ready.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setStep("consent");
    }
    setCreating(false);
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "fr", label: "French" },
    { code: "ar", label: "Arabic" },
    { code: "es", label: "Spanish" },
    { code: "sw", label: "Swahili" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Clone Voice</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {step === "info" && (
          <View className="gap-6 pt-4">
            <View className="items-center">
              <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
                <Ionicons name="mic" size={40} color="#8B5CF6" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">Create a Voice Clone</Text>
              <Text className="text-sm text-gray-500 text-center mt-2 px-4">
                Upload voice samples to create a custom AI voice. The more samples you provide, the better the quality.
              </Text>
            </View>

            <Card>
              <View className="gap-3">
                {[
                  { icon: "time-outline", title: "30 seconds to 3 minutes", desc: "Per sample for best results" },
                  { icon: "layers-outline", title: "Multiple samples", desc: "Upload several for higher accuracy" },
                  { icon: "musical-notes-outline", title: "WAV, MP3, M4A", desc: "Supported audio formats" },
                  { icon: "shield-checkmark-outline", title: "Consent required", desc: "Only clone voices you own or have permission for" },
                ].map((item) => (
                  <View key={item.title} className="flex-row items-start gap-3">
                    <Ionicons name={item.icon as any} size={22} color="#8B5CF6" />
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900 dark:text-gray-100">{item.title}</Text>
                      <Text className="text-sm text-gray-500">{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            <Button title="Get Started" onPress={() => setStep("upload")} fullWidth size="lg" />
          </View>
        )}

        {step === "upload" && (
          <View className="gap-4 pt-4">
            <Input label="Voice Name" value={cloneName} onChangeText={setCloneName} placeholder="e.g., My Voice, Sarah's Voice" />

            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</Text>
              <View className="flex-row flex-wrap gap-2">
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setLanguage(lang.code)}
                    className={`px-4 py-2 rounded-lg ${language === lang.code ? "bg-purple-500" : "bg-gray-100 dark:bg-gray-800"}`}
                  >
                    <Text className={`text-sm font-medium ${language === lang.code ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{lang.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={pickSample} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 items-center bg-gray-50 dark:bg-gray-800/50" activeOpacity={0.7}>
              <Ionicons name="mic-outline" size={40} color="#8B5CF6" />
              <Text className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-2">Upload Voice Samples</Text>
              <Text className="text-sm text-gray-500 mt-1">WAV, MP3, M4A accepted</Text>
            </TouchableOpacity>

            {samples.length > 0 && (
              <View>
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Samples ({samples.length})</Text>
                {samples.map((s, i) => (
                  <Card key={i} className="mb-2">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="musical-note" size={20} color="#8B5CF6" />
                      <Text className="flex-1 text-sm text-gray-900 dark:text-gray-100" numberOfLines={1}>{s.name}</Text>
                      <TouchableOpacity onPress={() => setSamples(samples.filter((_, idx) => idx !== i))}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            <Button title="Continue" onPress={() => setStep("consent")} disabled={samples.length === 0 || !cloneName} fullWidth size="lg" />
          </View>
        )}

        {step === "consent" && (
          <View className="gap-6 pt-4">
            <Card className="border-2 border-amber-200 dark:border-amber-800">
              <View className="flex-row items-start gap-3 mb-4">
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Consent Declaration</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    By proceeding, I declare that:
                  </Text>
                </View>
              </View>
              <View className="gap-3 ml-8">
                {[
                  "I own or have explicit permission to use the uploaded voice samples.",
                  "I will not use the cloned voice for deceptive, harmful, or illegal purposes.",
                  "I understand the cloned voice can only be used within the Audioly platform.",
                  "I accept full responsibility for any content generated using this voice clone.",
                ].map((item, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text className="text-sm text-gray-700 dark:text-gray-300">{i + 1}.</Text>
                    <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <TouchableOpacity onPress={() => setConsentGiven(!consentGiven)} className="flex-row items-center gap-3">
              <View className={`w-6 h-6 rounded border-2 items-center justify-center ${consentGiven ? "bg-purple-500 border-purple-500" : "border-gray-300 dark:border-gray-600"}`}>
                {consentGiven && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                I agree to the consent declaration above
              </Text>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <Button title="Back" onPress={() => setStep("upload")} variant="outline" style={{ flex: 1 }} />
              <Button title="Start Training" onPress={handleCreate} loading={creating} disabled={!consentGiven} style={{ flex: 2 }} icon={<Ionicons name="sparkles" size={20} color="#fff" />} />
            </View>
          </View>
        )}

        {step === "processing" && (
          <View className="items-center pt-20 gap-6">
            <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
              <Ionicons name="sparkles" size={40} color="#8B5CF6" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Training Voice Clone</Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              Analyzing voice characteristics and building your custom voice model...
            </Text>
            <ProgressBar progress={45} className="w-full" height={8} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
