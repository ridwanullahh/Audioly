import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayerStore } from "@/lib/store/player";
import { formatDuration } from "@/lib/utils";

export function MiniPlayer() {
  const store = usePlayerStore();
  const { currentAudio, isPlaying, position, duration } = store;

  if (!currentAudio) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const togglePlay = useCallback(() => {
    if (isPlaying) usePlayerStore.getState().pause();
    else usePlayerStore.getState().resume();
  }, [isPlaying]);

  return (
    <TouchableOpacity onPress={() => usePlayerStore.getState().maximize()} activeOpacity={0.9} className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <View className="h-1 bg-gray-200 dark:bg-gray-700">
        <View className="h-full bg-primary-500" style={{ width: `${progress}%` }} />
      </View>

      <View className="flex-row items-center px-4 py-3 gap-3">
        <View className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 items-center justify-center">
          {currentAudio.coverArt ? (
            <Image source={{ uri: currentAudio.coverArt }} className="w-10 h-10 rounded-lg" />
          ) : (
            <Ionicons name="musical-notes" size={20} color="#3B82F6" />
          )}
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
            {currentAudio.filename}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {formatDuration(position)} / {formatDuration(duration)}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => store.skipBackward(10)} hitSlop={8}>
            <Ionicons name="play-back" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} hitSlop={8}>
            <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={36} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => store.skipForward(30)} hitSlop={8}>
            <Ionicons name="play-forward" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
