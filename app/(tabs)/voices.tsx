import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Card, Badge } from "@/components/ui";
import { VoiceService, VoiceCloneService } from "@/services";
import type { Voice, VoiceClone } from "@/types";

type Gender = "all" | "male" | "female" | "neutral";
type VoiceTab = "system" | "clones" | "favorites";

export default function VoicesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<VoiceTab>("system");
  const [refreshing, setRefreshing] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [favorites, setFavorites] = useState<Voice[]>([]);
  const [genderFilter, setGenderFilter] = useState<Gender>("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const loadData = async () => {
    const [allVoices, userClones, userFavs] = await Promise.all([
      VoiceService.getAll(),
      user ? VoiceCloneService.getByUser(user.id) : Promise.resolve([]),
      user ? VoiceService.getFavorites(user.id) : Promise.resolve([]),
    ]);
    setVoices(allVoices);
    setClones(userClones);
    setFavorites(userFavs);
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const filteredVoices = useMemo(() => {
    let list = voices;
    if (genderFilter !== "all") list = list.filter((v: any) => v.gender === genderFilter);
    if (languageFilter !== "all") list = list.filter((v: any) => v.language_code?.startsWith(languageFilter));
    return list;
  }, [voices, genderFilter, languageFilter]);

  const toggleFavorite = async (voiceId: string) => {
    if (!user) return;
    const isFav = await VoiceService.toggleFavorite(user.id, voiceId);
    await loadData();
  };

  const languages = ["all", "en", "fr", "ar", "es", "sw"];
  const genders: { key: Gender; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "people" },
    { key: "female", label: "Female", icon: "woman" },
    { key: "male", label: "Male", icon: "man" },
    { key: "neutral", label: "Neutral", icon: "person" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Voices</Text>

        <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 mb-3">
          {(["system", "clones", "favorites"] as VoiceTab[]).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg items-center ${tab === t ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}>
              <Text className={`text-sm font-medium ${tab === t ? "text-primary-600" : "text-gray-500"}`}>
                {t === "system" ? "System" : t === "clones" ? "My Clones" : "Favorites"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "system" && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              {genders.map((g) => (
                <TouchableOpacity key={g.key} onPress={() => setGenderFilter(g.key)}
                  className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 ${genderFilter === g.key ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Ionicons name={g.icon as any} size={14} color={genderFilter === g.key ? "#fff" : "#6B7280"} />
                  <Text className={`text-sm font-medium ${genderFilter === g.key ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} className="mt-1">
              {languages.map((lang) => (
                <TouchableOpacity key={lang} onPress={() => setLanguageFilter(lang)}
                  className={`px-3 py-1.5 rounded-full ${languageFilter === lang ? "bg-primary-100 dark:bg-primary-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Text className={`text-xs font-medium ${languageFilter === lang ? "text-primary-700 dark:text-primary-300" : "text-gray-600 dark:text-gray-400"}`}>
                    {lang === "all" ? "All Languages" : lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === "system" && (
          <View className="px-4 gap-3">
            {filteredVoices.map((voice: any) => (
              <TouchableOpacity key={voice.id} activeOpacity={0.7}>
                <Card>
                  <View className="flex-row items-center gap-3">
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${
                      voice.gender === "female" ? "bg-pink-100 dark:bg-pink-900/30" : voice.gender === "male" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"
                    }`}>
                      <Ionicons
                        name={voice.gender === "female" ? "woman" : voice.gender === "male" ? "man" : "person"}
                        size={24}
                        color={voice.gender === "female" ? "#EC4899" : voice.gender === "male" ? "#3B82F6" : "#6B7280"}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-semibold text-gray-900 dark:text-gray-100">{voice.name}</Text>
                        <Badge text={voice.tone} variant="info" />
                      </View>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {voice.accent} · {voice.language} · {voice.category}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity onPress={() => toggleFavorite(voice.id)}>
                        <Ionicons
                          name={favorites.some((f: any) => f.id === voice.id) ? "heart" : "heart-outline"}
                          size={22}
                          color={favorites.some((f: any) => f.id === voice.id) ? "#EF4444" : "#9CA3AF"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 items-center justify-center">
                        <Ionicons name="play" size={18} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === "clones" && (
          <View className="px-4 gap-3 pt-2">
            <TouchableOpacity onPress={() => router.push("/voice/clone" as any)} className="bg-primary-600 rounded-2xl p-5 items-center" activeOpacity={0.8}>
              <Ionicons name="mic-outline" size={36} color="#fff" />
              <Text className="text-white text-lg font-bold mt-2">Clone a Voice</Text>
              <Text className="text-primary-100 text-sm mt-1">Upload a voice sample to create a custom voice</Text>
            </TouchableOpacity>

            {clones.map((clone: any) => (
              <Card key={clone.id}>
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                    <Ionicons name="mic" size={24} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{clone.name}</Text>
                    <Text className="text-xs text-gray-500">{clone.quality_score} · {clone.sample_count} samples · {clone.language}</Text>
                  </View>
                  <Badge
                    text={clone.is_training ? "Training" : "Ready"}
                    variant={clone.is_training ? "warning" : "success"}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {tab === "favorites" && (
          <View className="px-4 gap-3 pt-2">
            {favorites.length === 0 ? (
              <View className="items-center py-12">
                <Ionicons name="heart-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 mt-4">No favorite voices yet</Text>
              </View>
            ) : favorites.map((voice: any) => (
              <Card key={voice.id}>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{voice.name}</Text>
                    <Text className="text-xs text-gray-500">{voice.accent} · {voice.language}</Text>
                  </View>
                  <TouchableOpacity className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                    <Ionicons name="play" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
