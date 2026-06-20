import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card, Badge, Button } from "@/components/ui";
import { usePlayerStore } from "@/lib/store/player";
import { formatDuration } from "@/lib/utils";
import type { TranscriptSegment } from "@/types";

export default function TranscriptScreen() {
  const router = useRouter();
  const { audioId } = useLocalSearchParams<{ audioId: string }>();
  const { currentAudio, position, isPlaying, seekTo, play, pause, resume } = usePlayerStore();
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (currentAudio) {
      generateSegments();
    }
  }, [currentAudio]);

  useEffect(() => {
    if (segments.length === 0) return;
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (position >= segments[i].startTime && position <= segments[i].endTime) {
        idx = i;
        break;
      }
    }
    if (idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [position, segments]);

  const generateSegments = () => {
    if (!currentAudio) return;
    const mockText = `Welcome to this audiobook narration. This is a sample transcript demonstrating the synchronization feature. Each segment is timed to match the audio playback precisely. The text highlights as the narrator speaks, making it easy to follow along. You can tap on any segment to jump directly to that point in the audio. This feature is especially useful for language learners and those who prefer reading along with the narration. The transcript view supports various text sizes and search functionality to find specific passages quickly.`;
    const words = mockText.split(" ");
    const segs: TranscriptSegment[] = [];
    const wordsPerSeg = 8;
    const totalDuration = currentAudio.duration || 300;
    const segDuration = totalDuration / Math.ceil(words.length / wordsPerSeg);

    for (let i = 0; i < words.length; i += wordsPerSeg) {
      const segWords = words.slice(i, i + wordsPerSeg);
      const segIdx = Math.floor(i / wordsPerSeg);
      segs.push({
        text: segWords.join(" ") + ".",
        speaker: segIdx % 3 === 0 ? "Narrator" : undefined,
        startTime: segIdx * segDuration,
        endTime: (segIdx + 1) * segDuration,
        voiceId: "default",
      });
    }
    setSegments(segs);
  };

  const handleSegmentPress = (seg: TranscriptSegment) => {
    seekTo(seg.startTime);
    if (!isPlaying) resume();
  };

  const filteredSegments = searchQuery
    ? segments.filter((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : segments;

  const highlightWords = (text: string, isActive: boolean) => {
    if (!isActive || !searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">Transcript</Text>
        <Badge text={formatDuration(position)} />
      </View>

      <View className="px-4 mb-3 gap-2">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 gap-2">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transcript..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-sm text-gray-900 dark:text-gray-100"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => setAutoScroll(!autoScroll)}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${autoScroll ? "bg-primary-100 dark:bg-primary-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
              <Ionicons name="arrow-down-circle" size={14} color={autoScroll ? "#3B82F6" : "#6B7280"} />
              <Text className={`text-xs font-medium ${autoScroll ? "text-primary-600" : "text-gray-500"}`}>Auto-scroll</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => setFontSize(Math.max(12, fontSize - 2))}
              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Text className="text-xs font-bold text-gray-600 dark:text-gray-400">A-</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-500">{fontSize}</Text>
            <TouchableOpacity onPress={() => setFontSize(Math.min(24, fontSize + 2))}
              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Text className="text-sm font-bold text-gray-600 dark:text-gray-400">A+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredSegments.map((seg, idx) => {
          const isActive = idx === activeIndex;
          const isPast = seg.endTime < position;
          const isFuture = seg.startTime > position;

          return (
            <TouchableOpacity key={idx}
              onPress={() => handleSegmentPress(seg)}
              activeOpacity={0.7}
              className={`py-3 px-4 rounded-xl mb-2 ${isActive ? "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500" : isPast ? "opacity-50" : ""}`}>
              {seg.speaker && (
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-800 items-center justify-center">
                    <Ionicons name="person" size={10} color="#3B82F6" />
                  </View>
                  <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400">{seg.speaker}</Text>
                </View>
              )}
              <Text style={{ fontSize }}
                className={`${isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
                {searchQuery && isActive ? (
                  highlightWords(seg.text, isActive) as any
                ) : (
                  seg.text
                )}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-xs text-gray-400">{formatDuration(seg.startTime)}</Text>
                {isActive && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                    <Text className="text-xs text-primary-500 font-medium">Playing</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredSegments.length === 0 && (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4">
              {searchQuery ? "No matching segments found." : "No transcript available."}
            </Text>
          </View>
        )}
      </ScrollView>

      {currentAudio && (
        <View className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => { if (isPlaying) pause(); else resume(); }}
            className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center">
            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
          </TouchableOpacity>
          <View className="flex-1 mx-4">
            <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <View className="h-full bg-primary-500 rounded-full"
                style={{ width: `${currentAudio.duration > 0 ? (position / currentAudio.duration) * 100 : 0}%` }} />
            </View>
          </View>
          <Text className="text-xs text-gray-500 font-mono">{formatDuration(position)}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
