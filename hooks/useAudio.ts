import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import { usePlayerStore } from "@/lib/store/player";
import type { AudioFile } from "@/types";

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const store = usePlayerStore();

  const cleanup = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  }, []);

  const loadAndPlay = useCallback(async (audio: AudioFile) => {
    await cleanup();
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audio.filePath },
        { shouldPlay: true, rate: store.speed, shouldCorrectPitch: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      store.play(audio);
      startPositionTracking();
    } catch (err) {
      console.error("Failed to load audio:", err);
    }
  }, [store.speed]);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      store.setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      store.setPosition(status.positionMillis ? status.positionMillis / 1000 : 0);
      store.setBuffering(status.isBuffering ?? false);
      if (status.didJustFinish) {
        store.playNext();
      }
    }
  }, []);

  const startPositionTracking = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            store.setPosition(status.positionMillis / 1000);
          }
        } catch {}
      }
    }, 500);
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    if (store.isPlaying) {
      await soundRef.current.pauseAsync();
      store.pause();
    } else {
      await soundRef.current.playAsync();
      store.resume();
    }
  }, [store.isPlaying]);

  const seekTo = useCallback(async (positionSeconds: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(positionSeconds * 1000);
    store.seekTo(positionSeconds);
  }, []);

  const setSpeed = useCallback(async (speed: number) => {
    if (soundRef.current) {
      await soundRef.current.setRateAsync(speed, true);
    }
    store.setSpeed(speed);
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(volume);
    }
    store.setVolume(volume);
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
  }, []);

  return {
    ...store,
    loadAndPlay,
    togglePlayPause,
    seekTo,
    setSpeed,
    setVolume,
    cleanup,
  };
}
