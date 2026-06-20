import React, { useEffect, useState } from "react";
import { Slot } from "expo-router";
import { View, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth";
import { initializeApp } from "@/services";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { usePlayerStore } from "@/lib/store/player";
import { FullPlayer } from "@/components/player/FullPlayer";
import { useColorScheme } from "react-native";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 2 } },
});

export default function RootLayout() {
  const { restore, isLoading, isAuthenticated } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const currentAudio = usePlayerStore((s) => s.currentAudio);
  const isDark = useColorScheme() === "dark";
  const maximize = usePlayerStore((s) => s.maximize);

  useEffect(() => {
    (async () => {
      try {
        await initializeApp();
      } catch (err) {
        console.warn("App init warning:", err);
      }
      await restore();
      setAppReady(true);
    })();
  }, []);

  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      if (state.isMinimized === false && prev.isMinimized === true) {
        setShowFullPlayer(true);
      }
    });
    return unsub;
  }, []);

  if (!appReady || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
          <View className="flex-1 bg-gray-50 dark:bg-gray-900">
            <Slot />
            {currentAudio && <MiniPlayer />}
            {currentAudio && (
              <FullPlayer visible={showFullPlayer} onClose={() => { setShowFullPlayer(false); usePlayerStore.getState().minimize(); }} />
            )}
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
