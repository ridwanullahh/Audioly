import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Button, Badge, Divider } from "@/components/ui";

interface BuildInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  downloadUrl: string;
  platform: string;
}

export default function DownloadAppScreen() {
  const router = useRouter();
  const [builds, setBuilds] = useState<BuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/builds");
      if (res.ok) {
        const data = await res.json();
        setBuilds(data.builds || []);
      } else {
        setBuilds([]);
      }
    } catch {
      setBuilds([]);
    }
    setLoading(false);
  };

  const handleDownload = (build: BuildInfo) => {
    if (Platform.OS === "web") {
      window.location.href = build.downloadUrl;
    } else {
      Linking.openURL(build.downloadUrl);
    }
  };

  const platformIcon = (platform: string) => {
    switch (platform) {
      case "android": return "logo-android";
      case "ios": return "logo-apple";
      default: return "phone-portrait-outline";
    }
  };

  const platformColor = (platform: string) => {
    switch (platform) {
      case "android": return "#3DDC84";
      case "ios": return "#007AFF";
      default: return "#6B7280";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">Download App</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Card className="mb-4">
          <View className="items-center py-4">
            <View className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-4">
              <Ionicons name="logo-android" size={40} color="#3B82F6" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Audioly</Text>
            <Text className="text-sm text-gray-500 mb-1">Agentic AI Doc-to-Audio Platform</Text>
            <Badge text="v1.0.0" variant="info" />
          </View>
        </Card>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-500 mt-4">Checking for builds...</Text>
          </View>
        ) : builds.length === 0 ? (
          <Card className="mb-4">
            <View className="items-center py-6">
              <Ionicons name="cloud-outline" size={48} color="#9CA3AF" />
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">No Builds Available</Text>
              <Text className="text-sm text-gray-500 text-center px-4">
                Mobile builds are generated during deployment. Use EAS Build or the deploy script to create APK files.
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-3">
            {builds.map((build, idx) => (
              <Card key={idx}>
                <View className="flex-row items-center gap-4">
                  <View className="w-14 h-14 rounded-xl items-center justify-center" style={{ backgroundColor: `${platformColor(build.platform)}15` }}>
                    <Ionicons name={platformIcon(build.platform) as any} size={28} color={platformColor(build.platform)} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{build.platform} Build</Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className="text-xs text-gray-500">{build.sizeFormatted}</Text>
                      <Text className="text-xs text-gray-400">·</Text>
                      <Text className="text-xs text-gray-500">{new Date(build.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDownload(build)}
                    className="px-4 py-2.5 bg-primary-500 rounded-xl flex-row items-center gap-2">
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text className="text-sm font-semibold text-white">Download</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Card className="mt-4">
          <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Installation Guide</Text>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                <Text className="text-xs font-bold text-green-700 dark:text-green-300">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Download APK</Text>
                <Text className="text-xs text-gray-500">Tap the download button above to get the APK file.</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                <Text className="text-xs font-bold text-green-700 dark:text-green-300">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Allow Installation</Text>
                <Text className="text-xs text-gray-500">Go to Settings → Security → Enable "Install from Unknown Sources".</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                <Text className="text-xs font-bold text-green-700 dark:text-green-300">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Install & Open</Text>
                <Text className="text-xs text-gray-500">Open the downloaded file and tap "Install". Launch Audioly!</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card className="mt-4">
          <View className="flex-row items-center gap-3">
            <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Secure & Free</Text>
              <Text className="text-xs text-gray-500">All builds are signed with a debug keystore. No paid developer accounts required for personal use.</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
