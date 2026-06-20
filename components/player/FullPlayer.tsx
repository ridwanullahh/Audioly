import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, Modal as RNModal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePlayerStore } from "@/lib/store/player";
import { formatDuration } from "@/lib/utils";
import { SPEED_OPTIONS } from "@/constants";
import type { ChapterMarker } from "@/types";

export function FullPlayer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const store = usePlayerStore();
  const { currentAudio, isPlaying, position, duration, speed, volume, repeatMode, currentChapter } = store;
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  if (!currentAudio) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const chapters: ChapterMarker[] = currentAudio.chapterMarkers ?? [];
  const activeChapterIdx = useMemo(() => {
    if (chapters.length === 0) return -1;
    for (let i = 0; i < chapters.length; i++) {
      if (position >= chapters[i].startTime && position <= chapters[i].endTime) return i;
    }
    return -1;
  }, [position, chapters]);

  const togglePlay = () => {
    if (isPlaying) store.pause();
    else store.resume();
  };

  const cycleRepeat = () => {
    const modes: Array<"off" | "one" | "all"> = ["off", "all", "one"];
    const currentIdx = modes.indexOf(repeatMode);
    store.setRepeatMode(modes[(currentIdx + 1) % modes.length]);
  };

  const jumpToChapter = (chapter: ChapterMarker) => {
    store.seekTo(chapter.startTime);
    store.setCurrentChapter(chapter);
    setShowChapters(false);
  };

  const setSleepTimer = (minutes: number) => {
    store.setSleepTimer(minutes);
    setShowSleepPicker(false);
  };

  const repeatIcons: Record<string, { icon: string; active: boolean }> = {
    off: { icon: "repeat", active: false },
    all: { icon: "repeat", active: true },
    one: { icon: "repeat-once", active: true },
  };

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-down" size={28} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-sm font-medium text-gray-500 uppercase tracking-wide">Now Playing</Text>
          <TouchableOpacity onPress={() => setShowSleepPicker(true)} hitSlop={12}>
            <Ionicons name="moon-outline" size={22} color={store.sleepTimer ? "#F59E0B" : "#6B7280"} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ alignItems: "center", paddingTop: 20 }}>
          <View className="w-64 h-64 rounded-3xl bg-primary-100 dark:bg-primary-900 items-center justify-center mb-8 shadow-lg">
            {currentAudio.coverArt ? (
              <Image source={{ uri: currentAudio.coverArt }} className="w-64 h-64 rounded-3xl" />
            ) : (
              <Ionicons name="musical-notes" size={80} color="#3B82F6" />
            )}
          </View>

          <View className="w-full mb-4">
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center" numberOfLines={2}>
              {currentAudio.filename}
            </Text>
            {currentAudio.metadata?.author && (
              <Text className="text-base text-gray-500 dark:text-gray-400 text-center mt-1">{currentAudio.metadata.author}</Text>
            )}
            {activeChapterIdx >= 0 && chapters[activeChapterIdx] && (
              <Text className="text-sm text-primary-600 text-center mt-1">{chapters[activeChapterIdx].title}</Text>
            )}
          </View>

          <View className="w-full mb-4">
            <TouchableOpacity onPress={() => store.seekTo(Math.max(0, position - 5))} activeOpacity={1}>
              <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View className="h-full bg-primary-500 rounded-full" style={{ width: `${progress}%` }} />
              </View>
            </TouchableOpacity>
            <View className="flex-row justify-between mt-1.5">
              <Text className="text-xs text-gray-500">{formatDuration(position)}</Text>
              <Text className="text-xs text-gray-500">{formatDuration(duration)}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center gap-8 mb-8">
            <TouchableOpacity onPress={() => store.skipBackward(10)}>
              <Ionicons name="play-back" size={36} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => store.playPrevious()}>
              <Ionicons name="play-skip-back" size={32} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} className="w-16 h-16 rounded-full bg-primary-500 items-center justify-center">
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => store.playNext()}>
              <Ionicons name="play-skip-forward" size={32} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => store.skipForward(30)}>
              <Ionicons name="play-forward" size={36} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between w-full px-2 mb-4">
            <TouchableOpacity onPress={cycleRepeat}>
              <Ionicons name="repeat" size={22} color={repeatMode === "off" ? "#9CA3AF" : "#3B82F6"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSpeedPicker(true)} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{speed}x</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowChapters(true)}>
              <Ionicons name="list" size={22} color={chapters.length > 0 ? "#3B82F6" : "#6B7280"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push(`/player/transcript?audioId=${currentAudio.id}`)}>
              <Ionicons name="document-text-outline" size={22} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push(`/player/editor?audioId=${currentAudio.id}`)}>
              <Ionicons name="cut-outline" size={22} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity>
              <Ionicons name="share-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {store.sleepTimer && (
            <View className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full flex-row items-center gap-2">
              <Ionicons name="moon" size={16} color="#F59E0B" />
              <Text className="text-sm text-amber-700 dark:text-amber-300">Sleep: {store.sleepTimer}m</Text>
            </View>
          )}
        </ScrollView>

        <RNModal visible={showSpeedPicker} transparent animationType="fade">
          <TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={() => setShowSpeedPicker(false)}>
            <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">Playback Speed</Text>
              <View className="flex-row flex-wrap justify-center gap-3">
                {SPEED_OPTIONS.map((s) => (
                  <TouchableOpacity key={s}
                    onPress={() => { store.setSpeed(s); setShowSpeedPicker(false); }}
                    className={`w-16 h-12 rounded-xl items-center justify-center ${speed === s ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}>
                    <Text className={`font-semibold ${speed === s ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{s}x</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </RNModal>

        <RNModal visible={showChapters} transparent animationType="fade">
          <TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={() => setShowChapters(false)}>
            <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-4 max-h-[70%]">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Chapters</Text>
                <TouchableOpacity onPress={() => setShowChapters(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              {chapters.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="list-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-3">No chapters available</Text>
                </View>
              ) : (
                <FlatList
                  data={chapters}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => {
                    const isActive = index === activeChapterIdx;
                    return (
                      <TouchableOpacity onPress={() => jumpToChapter(item)}
                        className={`flex-row items-center py-3 px-3 rounded-xl mb-1 ${isActive ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}>
                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isActive ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}>
                          <Text className={`text-xs font-bold ${isActive ? "text-white" : "text-gray-500"}`}>{index + 1}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className={`text-sm font-medium ${isActive ? "text-primary-600" : "text-gray-900 dark:text-gray-100"}`} numberOfLines={1}>{item.title}</Text>
                          <Text className="text-xs text-gray-500">{formatDuration(item.startTime)} - {formatDuration(item.endTime)}</Text>
                        </View>
                        {isActive && <Ionicons name="play-circle" size={20} color="#3B82F6" />}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        </RNModal>

        <RNModal visible={showSleepPicker} transparent animationType="fade">
          <TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={() => setShowSleepPicker(false)}>
            <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">Sleep Timer</Text>
              <View className="flex-row flex-wrap justify-center gap-3">
                {[5, 10, 15, 30, 45, 60, 90].map((m) => (
                  <TouchableOpacity key={m}
                    onPress={() => setSleepTimer(m)}
                    className={`w-20 h-12 rounded-xl items-center justify-center ${store.sleepTimer === m ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}>
                    <Text className={`font-semibold ${store.sleepTimer === m ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{m}m</Text>
                  </TouchableOpacity>
                ))}
                {store.sleepTimer && (
                  <TouchableOpacity onPress={() => { store.setSleepTimer(null); setShowSleepPicker(false); }}
                    className="w-20 h-12 rounded-xl items-center justify-center bg-red-100 dark:bg-red-900/30">
                    <Text className="font-semibold text-red-600">Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </RNModal>
      </SafeAreaView>
    </RNModal>
  );
}
