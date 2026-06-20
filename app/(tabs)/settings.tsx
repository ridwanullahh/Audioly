import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { useAppStore } from "@/lib/store/app";
import { Card, Divider, Avatar, Input, Button } from "@/components/ui";
import { ProviderConfigService } from "@/services";
import * as SecureStore from "expo-secure-store";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuthStore();
  const { theme, setTheme, language, setLanguage, addToast } = useAppStore();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [cfApiKey, setCfApiKey] = useState("");
  const [cfAccountId, setCfAccountId] = useState("");
  const [nvApiKey, setNvApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);

  const isDark = theme === "dark" || (theme === "system");

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    try {
      if (cfApiKey && cfAccountId) {
        await ProviderConfigService.saveConfig("cloudflare", cfApiKey, cfAccountId);
      }
      if (nvApiKey) {
        await ProviderConfigService.saveConfig("nvidia", nvApiKey);
      }
      if (geminiApiKey) {
        await ProviderConfigService.saveConfig("gemini", geminiApiKey);
      }
      addToast({ title: "API Keys Saved", type: "success" });
      setCfApiKey("");
      setCfAccountId("");
      setNvApiKey("");
      setGeminiApiKey("");
    } catch (err) {
      addToast({ title: "Failed to save keys", type: "error" });
    }
    setSavingKeys(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  interface SettingsItem {
    icon: string;
    label: string;
    badge?: string;
    detail?: string;
    isToggle?: boolean;
    value?: boolean;
    onToggle?: () => void;
    action?: () => void;
  }

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: "Account",
      items: [
        { icon: "person-outline", label: "Edit Profile", action: () => {} },
        { icon: "shield-checkmark-outline", label: "Change Password", action: () => {} },
        { icon: "card-outline", label: "Subscription", badge: user?.planId === "business" ? "Business" : user?.planId === "pro" ? "Pro" : "Free", action: () => router.push("/upgrade") },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: "moon-outline", label: "Dark Mode", isToggle: true, value: theme === "dark", onToggle: () => setTheme(theme === "dark" ? "light" : "dark") },
        { icon: "language-outline", label: "Language", detail: language === "en" ? "English" : language === "fr" ? "French" : language === "ar" ? "Arabic" : language === "es" ? "Spanish" : language === "sw" ? "Swahili" : "English", action: () => {} },
        { icon: "speedometer-outline", label: "Default Playback Speed", detail: "1.0x", action: () => {} },
        { icon: "notifications-outline", label: "Notifications", action: () => router.push("/notifications") },
      ],
    },
    {
      title: "Voice & Audio",
      items: [
        { icon: "book-outline", label: "Pronunciation Dictionary", action: () => router.push("/pronunciation") },
        { icon: "folder-outline", label: "Folders", action: () => router.push("/folders") },
        { icon: "chatbubble-ellipses-outline", label: "Feedback", action: () => router.push("/feedback") },
      ],
    },
    {
      title: "AI Providers",
      items: [
        { icon: "key-outline", label: "API Keys", action: () => setShowApiKeys(!showApiKeys) },
        { icon: "swap-horizontal-outline", label: "Default Provider", detail: "Cloudflare", action: () => {} },
        { icon: "pulse-outline", label: "Provider Status", action: () => {} },
      ],
    },
    {
      title: "Data & Storage",
      items: [
        { icon: "cloud-download-outline", label: "Offline Downloads", action: () => router.push("/downloads") },
        { icon: "trash-outline", label: "Trash", action: () => router.push("/trash") },
        { icon: "trash-bin-outline", label: "Clear Cache", action: () => addToast({ title: "Cache cleared", type: "success" }) },
        { icon: "document-text-outline", label: "Auto-delete Source Docs", isToggle: true, value: false, onToggle: () => {} },
      ],
    },
    {
      title: "Developer",
      items: [
        { icon: "code-slash-outline", label: "API Keys (Developer)", action: () => router.push("/api-keys") },
        { icon: "share-social-outline", label: "Sharing & Webhooks", action: () => router.push("/share") },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle-outline", label: "Help Center", action: () => router.push("/support") },
        { icon: "document-lock-outline", label: "Privacy Policy", action: () => {} },
        { icon: "information-circle-outline", label: "About Audioly", detail: "v1.0.0", action: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Settings</Text>

          <Card className="mb-4">
            <View className="flex-row items-center gap-3">
              <Avatar name={user?.name ?? "User"} size={56} />
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{user?.name}</Text>
                <Text className="text-sm text-gray-500">{user?.email}</Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="diamond" size={14} color="#8B5CF6" />
                  <Text className="text-xs font-medium text-purple-600 capitalize">{user?.planId} Plan</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {showApiKeys && (
          <View className="px-4 mb-4">
            <Card>
              <Text className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Configure AI Provider Keys</Text>
              <Text className="text-xs text-gray-500 mb-3">Add API keys to enable Cloudflare Workers AI and NVIDIA NIM models.</Text>

              <View className="gap-3">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Cloudflare Workers AI</Text>
                <Input label="API Token" value={cfApiKey} onChangeText={setCfApiKey} placeholder="cf_xxxxx" secureTextEntry />
                <Input label="Account ID" value={cfAccountId} onChangeText={setCfAccountId} placeholder="account-id" />

                <Divider className="my-2" />

                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">NVIDIA NIM</Text>
                <Input label="API Key" value={nvApiKey} onChangeText={setNvApiKey} placeholder="nvapi-xxxxx" secureTextEntry />

                <Divider className="my-2" />

                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Google Gemini</Text>
                <Input label="API Key" value={geminiApiKey} onChangeText={setGeminiApiKey} placeholder="AIza..." secureTextEntry />

                <Button title="Save API Keys" onPress={handleSaveApiKeys} loading={savingKeys} fullWidth />
              </View>
            </Card>
          </View>
        )}

        {settingsSections.map((section) => (
          <View key={section.title} className="mb-4">
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 px-4 mb-2 uppercase tracking-wide">{section.title}</Text>
            <Card className="mx-4">
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  {idx > 0 && <Divider className="my-0" />}
                  <TouchableOpacity
                    onPress={item.action}
                    className="flex-row items-center py-3.5 gap-3"
                    disabled={!item.action && !item.isToggle}
                  >
                    <Ionicons name={item.icon as any} size={22} color="#6B7280" />
                    <Text className="flex-1 text-base text-gray-900 dark:text-gray-100">{item.label}</Text>
                    {item.badge && <Text className="text-sm text-purple-600 font-medium">{item.badge}</Text>}
                    {item.detail && <Text className="text-sm text-gray-500">{item.detail}</Text>}
                    {item.isToggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ true: "#3B82F6", false: "#D1D5DB" }}
                        thumbColor="#fff"
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        <View className="px-4 mt-2 mb-8">
          <Button title="Sign Out" onPress={handleLogout} variant="danger" fullWidth icon={<Ionicons name="log-out-outline" size={20} color="#fff" />} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
