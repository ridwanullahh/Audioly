import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Input, Badge, Divider, EmptyState } from "@/components/ui";
import { ShareService, WebhookService } from "@/services/extended";
import { AudioService } from "@/services";
import { getRelativeTime } from "@/lib/utils";
import type { ShareLink, AudioFile, Webhook } from "@/types";

type Tab = "links" | "webhooks";

export default function SharingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { audioId } = useLocalSearchParams<{ audioId?: string }>();
  const [tab, setTab] = useState<Tab>("links");
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["conversion.complete"]);
  const [addingWebhook, setAddingWebhook] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [links, whs] = await Promise.all([ShareService.getByUser(user.id), WebhookService.getByUser(user.id)]);
      setShareLinks(links);
      setWebhooks(whs);
    })();
  }, [user]);

  const createShareLink = async () => {
    if (!user || !audioId) return;
    setCreating(true);
    try {
      const link = await ShareService.createLink(audioId, user.id, { password: password || undefined });
      setShareLinks([link, ...shareLinks]);
      Alert.alert("Link Created", `Share URL: https://audioly.app/s/${link.token}`);
      setPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setCreating(false);
  };

  const copyLink = async (token: string) => {
    await Clipboard.setStringAsync(`https://audioly.app/s/${token}`);
    Alert.alert("Copied", "Share link copied to clipboard");
  };

  const copyEmbed = (token: string) => {
    const embed = ShareService.generateEmbedCode(token);
    Clipboard.setStringAsync(embed);
    Alert.alert("Copied", "Embed code copied to clipboard");
  };

  const shareNative = async (token: string) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(`https://audioly.app/s/${token}`, { dialogTitle: "Share Audio" });
    }
  };

  const addWebhook = async () => {
    if (!user || !webhookUrl) return;
    setAddingWebhook(true);
    try {
      const wh = await WebhookService.create({ userId: user.id, url: webhookUrl, events: webhookEvents });
      setWebhooks([wh, ...webhooks]);
      setWebhookUrl("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setAddingWebhook(false);
  };

  const eventOptions = ["conversion.complete", "conversion.failed", "voice.clone.ready", "audio.exported", "share.viewed"];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Sharing & Publishing</Text>
      </View>

      <View className="flex-row px-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mx-4 mb-4 gap-1">
        {(["links", "webhooks"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg items-center ${tab === t ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}>
            <Text className={`text-sm font-medium ${tab === t ? "text-primary-600" : "text-gray-500"}`}>
              {t === "links" ? "Share Links" : "Webhooks"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {tab === "links" && (
          <>
            {audioId && (
              <Card className="mb-4">
                <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Create New Share Link</Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="flex-row items-center gap-2 mb-3">
                  <View className={`w-5 h-5 rounded border-2 items-center justify-center ${showPassword ? "bg-primary-500 border-primary-500" : "border-gray-300"}`}>
                    {showPassword && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text className="text-sm text-gray-700 dark:text-gray-300">Password protect this link</Text>
                </TouchableOpacity>
                {showPassword && (
                  <View className="mb-3">
                    <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
                  </View>
                )}
                <Button title="Generate Share Link" onPress={createShareLink} loading={creating} fullWidth icon={<Ionicons name="link" size={18} color="#fff" />} />
              </Card>
            )}

            {shareLinks.length === 0 ? (
              <EmptyState icon="link-outline" title="No share links" message="Select an audio file and create a share link to get started." />
            ) : (
              <View className="gap-3">
                {shareLinks.map((link: any) => (
                  <Card key={link.id}>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-mono text-sm text-primary-600">audioly.app/s/{link.token}</Text>
                      <Badge text={link.is_active ? "Active" : "Expired"} variant={link.is_active ? "success" : "error"} />
                    </View>
                    <View className="flex-row items-center gap-4 mt-2">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="eye" size={14} color="#6B7280" />
                        <Text className="text-xs text-gray-500">{link.view_count} views</Text>
                      </View>
                      {link.password_hash ? (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="lock-closed" size={14} color="#F59E0B" />
                          <Text className="text-xs text-amber-600">Protected</Text>
                        </View>
                      ) : null}
                      {link.expires_at ? (
                        <Text className="text-xs text-gray-500">Expires: {new Date(link.expires_at).toLocaleDateString()}</Text>
                      ) : null}
                    </View>
                    <Divider className="my-3" />
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => copyLink(link.token)} className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Ionicons name="copy-outline" size={16} color="#6B7280" />
                        <Text className="text-xs text-gray-700 dark:text-gray-300">Copy Link</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => copyEmbed(link.token)} className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Ionicons name="code-slash-outline" size={16} color="#6B7280" />
                        <Text className="text-xs text-gray-700 dark:text-gray-300">Embed</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => shareNative(link.token)} className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                        <Ionicons name="share-outline" size={16} color="#3B82F6" />
                        <Text className="text-xs text-primary-600">Share</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "webhooks" && (
          <>
            <Card className="mb-4">
              <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Webhook</Text>
              <View className="gap-3">
                <Input label="URL" value={webhookUrl} onChangeText={setWebhookUrl} placeholder="https://your-server.com/webhook" autoCapitalize="none" keyboardType="url" />
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Events</Text>
                <View className="flex-row flex-wrap gap-2">
                  {eventOptions.map((evt) => (
                    <TouchableOpacity key={evt}
                      onPress={() => setWebhookEvents(webhookEvents.includes(evt) ? webhookEvents.filter((e) => e !== evt) : [...webhookEvents, evt])}
                      className={`px-3 py-1.5 rounded-lg ${webhookEvents.includes(evt) ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <Text className={`text-xs ${webhookEvents.includes(evt) ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>{evt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button title="Add Webhook" onPress={addWebhook} loading={addingWebhook} disabled={!webhookUrl} fullWidth />
              </View>
            </Card>

            {webhooks.length === 0 ? (
              <EmptyState icon="webhook-outline" title="No webhooks" message="Add a webhook URL to receive real-time event notifications." />
            ) : (
              <View className="gap-3">
                {webhooks.map((wh: any) => (
                  <Card key={wh.id}>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-mono text-sm text-gray-900 dark:text-gray-100 flex-1" numberOfLines={1}>{wh.url}</Text>
                      <Badge text={wh.is_active ? "Active" : "Disabled"} variant={wh.is_active ? "success" : "error"} />
                    </View>
                    <View className="flex-row flex-wrap gap-1 mt-1">
                      {(JSON.parse(wh.events || "[]") as string[]).map((evt: string) => (
                        <Badge key={evt} text={evt} variant="info" />
                      ))}
                    </View>
                    <View className="flex-row gap-2 mt-3">
                      <TouchableOpacity onPress={() => WebhookService.toggle(wh.id)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg items-center">
                        <Text className="text-xs text-gray-700 dark:text-gray-300">{wh.is_active ? "Disable" : "Enable"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => WebhookService.delete(wh.id)} className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg items-center">
                        <Text className="text-xs text-red-600">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
