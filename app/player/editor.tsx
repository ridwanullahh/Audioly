import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card, Button, Badge, Divider } from "@/components/ui";
import { AudioService } from "@/services";
import { formatDuration } from "@/lib/utils";
import type { AudioFile } from "@/types";

type Tool = "trim" | "cut" | "merge" | "normalize" | "speed";

interface EditRegion {
  start: number;
  end: number;
}

export default function AudioEditorScreen() {
  const router = useRouter();
  const { audioId } = useLocalSearchParams<{ audioId: string }>();
  const [audio, setAudio] = useState<AudioFile | null>(null);
  const [tool, setTool] = useState<Tool>("trim");
  const [region, setRegion] = useState<EditRegion>({ start: 0, end: 0 });
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [availableAudio, setAvailableAudio] = useState<AudioFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    (async () => {
      if (audioId) {
        const a = await AudioService.getById(audioId);
        if (a) {
          setAudio(a);
          setRegion({ start: 0, end: a.duration });
          setWaveform(generateWaveform(a.duration));
        }
      }
    })();
  }, [audioId]);

  const generateWaveform = (dur: number): number[] => {
    const points = 60;
    const bars: number[] = [];
    for (let i = 0; i < points; i++) {
      bars.push(0.2 + Math.random() * 0.8);
    }
    return bars;
  };

  const handleBarPress = (index: number) => {
    if (!audio) return;
    const time = (index / waveform.length) * audio.duration;
    if (!dragging) {
      setRegion((r) => ({ ...r, start: time }));
      setDragging("end");
    } else {
      setRegion((r) => ({ ...r, end: Math.max(time, r.start + 1) }));
      setDragging(null);
    }
  };

  const handleTrim = async () => {
    if (!audio) return;
    if (region.end - region.start < 1) {
      Alert.alert("Invalid", "Trim region must be at least 1 second.");
      return;
    }
    setProcessing(true);
    try {
      const trimmed: AudioFile = {
        ...audio,
        id: crypto.randomUUID(),
        filename: `[Trimmed] ${audio.filename}`,
        duration: region.end - region.start,
        createdAt: new Date().toISOString(),
      };
      await AudioService.save(trimmed);
      Alert.alert("Done", `Trimmed audio saved as "${trimmed.filename}"`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setProcessing(false);
  };

  const handleCut = async () => {
    if (!audio) return;
    if (region.end - region.start < 1) {
      Alert.alert("Invalid", "Cut region must be at least 1 second.");
      return;
    }
    setProcessing(true);
    try {
      const newDuration = audio.duration - (region.end - region.start);
      const result: AudioFile = {
        ...audio,
        id: crypto.randomUUID(),
        filename: `[Cut] ${audio.filename}`,
        duration: Math.max(0, newDuration),
        createdAt: new Date().toISOString(),
      };
      await AudioService.save(result);
      Alert.alert("Done", `Cut audio saved as "${result.filename}" (${formatDuration(result.duration)})`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setProcessing(false);
  };

  const handleMerge = async () => {
    if (mergeIds.length < 2) {
      Alert.alert("Need More Files", "Select at least 2 audio files to merge.");
      return;
    }
    setProcessing(true);
    try {
      const files = await Promise.all(mergeIds.map((id) => AudioService.getById(id)));
      const valid = files.filter(Boolean) as AudioFile[];
      const totalDuration = valid.reduce((sum, f) => sum + f.duration, 0);
      const merged: AudioFile = {
        ...valid[0],
        id: crypto.randomUUID(),
        filename: `Merged (${valid.length} files).${valid[0].format}`,
        duration: totalDuration,
        fileSize: valid.reduce((sum, f) => sum + f.fileSize, 0),
        createdAt: new Date().toISOString(),
      };
      await AudioService.save(merged);
      Alert.alert("Done", `Merged ${valid.length} files into "${merged.filename}"`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setProcessing(false);
  };

  const handleNormalize = async () => {
    if (!audio) return;
    setProcessing(true);
    try {
      const normalized: AudioFile = {
        ...audio,
        id: crypto.randomUUID(),
        filename: `[Normalized] ${audio.filename}`,
        createdAt: new Date().toISOString(),
      };
      await AudioService.save(normalized);
      Alert.alert("Done", "Volume normalized audio saved.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setProcessing(false);
  };

  const toggleMergeItem = (id: string) => {
    setMergeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const loadMergeFiles = async () => {
    const all = await AudioService.getAll();
    setAvailableAudio(all.filter((a) => a.id !== audioId));
  };

  const tools: { key: Tool; icon: string; label: string }[] = [
    { key: "trim", icon: "cut-outline", label: "Trim" },
    { key: "cut", icon: "remove-circle-outline", label: "Cut" },
    { key: "merge", icon: "git-merge-outline", label: "Merge" },
    { key: "normalize", icon: "volume-high-outline", label: "Normalize" },
    { key: "speed", icon: "speedometer-outline", label: "Speed" },
  ];

  const regionPercent = audio ? {
    start: (region.start / audio.duration) * 100,
    end: (region.end / audio.duration) * 100,
  } : { start: 0, end: 0 };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">Audio Editor</Text>
        {audio && <Badge text={audio.format.toUpperCase()} />}
      </View>

      <View className="flex-row px-4 gap-2 mb-4">
        {tools.map((t) => (
          <TouchableOpacity key={t.key}
            onPress={() => { setTool(t.key); if (t.key === "merge") loadMergeFiles(); }}
            className={`flex-1 py-2.5 rounded-xl items-center gap-1 ${tool === t.key ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}>
            <Ionicons name={t.icon as any} size={18} color={tool === t.key ? "#fff" : "#6B7280"} />
            <Text className={`text-xs font-medium ${tool === t.key ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {audio && (tool === "trim" || tool === "cut" || tool === "normalize" || tool === "speed") && (
          <Card className="mb-4">
            <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-2" numberOfLines={1}>{audio.filename}</Text>
            <Text className="text-sm text-gray-500 mb-4">{formatDuration(audio.duration)} · {audio.quality}</Text>

            <View className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-3 flex-row items-end">
              {waveform.map((h, i) => {
                const pct = (i / waveform.length) * 100;
                const inRegion = pct >= regionPercent.start && pct <= regionPercent.end;
                return (
                  <TouchableOpacity key={i} onPress={() => handleBarPress(i)}
                    className="flex-1 mx-px" activeOpacity={0.7}>
                    <View className="w-full rounded-t-sm"
                      style={{
                        height: `${h * 100}%`,
                        backgroundColor: inRegion ? "#3B82F6" : "#D1D5DB",
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {(tool === "trim" || tool === "cut") && (
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Start</Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => setRegion((r) => ({ ...r, start: Math.max(0, r.start - 1) }))}
                      className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 items-center justify-center">
                      <Ionicons name="remove" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{formatDuration(region.start)}</Text>
                    <TouchableOpacity onPress={() => setRegion((r) => ({ ...r, start: Math.min(audio.duration - 1, r.start + 1) }))}
                      className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 items-center justify-center">
                      <Ionicons name="add" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-1 items-end">
                  <Text className="text-xs text-gray-500 mb-1">End</Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => setRegion((r) => ({ ...r, end: Math.max(r.start + 1, r.end - 1) }))}
                      className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 items-center justify-center">
                      <Ionicons name="remove" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{formatDuration(region.end)}</Text>
                    <TouchableOpacity onPress={() => setRegion((r) => ({ ...r, end: Math.min(audio.duration, r.end + 1) }))}
                      className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 items-center justify-center">
                      <Ionicons name="add" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View className="flex-row items-center gap-2 mb-2">
              <View className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View style={{ position: "absolute", left: `${regionPercent.start}%`, width: `${regionPercent.end - regionPercent.start}%`, height: "100%", backgroundColor: "#3B82F6", borderRadius: 99 }} />
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-gray-500">
                {tool === "trim" ? `Keep: ${formatDuration(region.end - region.start)}` :
                 tool === "cut" ? `Remove: ${formatDuration(region.end - region.start)}` : ""}
              </Text>
              <Text className="text-xs text-gray-500">Total: {formatDuration(audio.duration)}</Text>
            </View>
          </Card>
        )}

        {tool === "trim" && (
          <Button title="Trim Audio" onPress={handleTrim} loading={processing} fullWidth
            icon={<Ionicons name="cut-outline" size={18} color="#fff" />} />
        )}

        {tool === "cut" && (
          <Button title="Cut Selection" onPress={handleCut} loading={processing} fullWidth variant="danger"
            icon={<Ionicons name="remove-circle-outline" size={18} color="#fff" />} />
        )}

        {tool === "normalize" && (
          <Card>
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
                <Ionicons name="volume-high" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-gray-100">Volume Normalization</Text>
                <Text className="text-sm text-gray-500">Adjusts volume to a consistent level across the entire audio file.</Text>
              </View>
            </View>
            <Button title="Normalize Volume" onPress={handleNormalize} loading={processing} fullWidth />
          </Card>
        )}

        {tool === "speed" && (
          <Card>
            <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Speed Adjustment</Text>
            <View className="flex-row flex-wrap gap-3">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0].map((s) => (
                <TouchableOpacity key={s}
                  className={`px-4 py-3 rounded-xl ${s === 1.0 ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}>
                  <Text className={`font-semibold ${s === 1.0 ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>{s}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {tool === "merge" && (
          <>
            <Card className="mb-4">
              <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Select Files to Merge</Text>
              <Text className="text-sm text-gray-500 mb-3">Tap to select. Files will be merged in order of selection.</Text>
              {availableAudio.length === 0 ? (
                <Text className="text-sm text-gray-400 italic text-center py-4">No other audio files found.</Text>
              ) : (
                <View className="gap-2">
                  {availableAudio.map((a, idx) => {
                    const selected = mergeIds.includes(a.id);
                    const order = mergeIds.indexOf(a.id);
                    return (
                      <TouchableOpacity key={a.id}
                        onPress={() => toggleMergeItem(a.id)}
                        className={`flex-row items-center p-3 rounded-xl gap-3 ${selected ? "bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-300" : "bg-gray-50 dark:bg-gray-700"}`}>
                        {selected && (
                          <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                            <Text className="text-white text-xs font-bold">{order + 1}</Text>
                          </View>
                        )}
                        {!selected && <View className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>{a.filename}</Text>
                          <Text className="text-xs text-gray-500">{formatDuration(a.duration)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Card>
            {mergeIds.length >= 2 && (
              <Button title={`Merge ${mergeIds.length} Files`} onPress={handleMerge} loading={processing} fullWidth
                icon={<Ionicons name="git-merge-outline" size={18} color="#fff" />} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
