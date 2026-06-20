import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Card, Badge, Input, ProgressBar } from "@/components/ui";
import { DocumentService, ProjectService, NotificationService } from "@/services";
import { processImageFile } from "@/services/image-ocr";
import { ALL_FILE_EXTENSIONS, NARRATION_MODES } from "@/constants";
import { formatFileSize, estimateReadingDuration } from "@/lib/utils";
import type { NarrationMode } from "@/types";

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"select" | "configure" | "processing">("select");
  const [narrationMode, setNarrationMode] = useState<NarrationMode>("straight");
  const [progress, setProgress] = useState(0);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "application/epub+zip", "text/markdown", "text/html", "image/png", "image/jpeg", "image/webp", "image/bmp"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setSelectedFiles([...selectedFiles, ...result.assets]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick files");
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setSelectedFiles([...selectedFiles, { name: urlInput, uri: urlInput, size: 0, mimeType: "url" }]);
    setUrlInput("");
  };

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType === "url") return "globe-outline";
    if (mimeType?.includes("pdf") || name?.endsWith(".pdf")) return "document-text-outline";
    if (mimeType?.includes("word") || name?.endsWith(".docx")) return "document-outline";
    if (mimeType?.includes("epub") || name?.endsWith(".epub")) return "book-outline";
    if (name?.endsWith(".md")) return "code-slash-outline";
    return "document-outline";
  };

  const processUpload = async () => {
    if (!user || selectedFiles.length === 0) return;
    setUploading(true);
    setStep("processing");
    setProgress(5);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProgress(Math.round(((i + 0.5) / selectedFiles.length) * 80));

        let content = "";
        const isImage = file.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp)$/i.test(file.name ?? "");

        if (isImage && file.uri && !file.uri.startsWith("http")) {
          try {
            const { content: imageContent } = await processImageFile(file.uri, file.name ?? "image");
            content = imageContent || `[Image: ${file.name}]`;
          } catch {
            content = `[Image: ${file.name} - OCR processing unavailable]`;
          }
        } else if (file.mimeType === "url" || file.uri?.startsWith("http")) {
          try {
            const response = await fetch(file.uri);
            content = await response.text();
            content = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
          } catch {
            content = `[Web content from ${file.uri}]`;
          }
        } else if (file.uri) {
          try {
            content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
          } catch {
            content = `[Content from ${file.name}]`;
          }
        }

        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const estimatedDuration = estimateReadingDuration(wordCount);

        const doc = await DocumentService.create({
          userId: user.id,
          title: file.name?.replace(/\.[^.]+$/, "") ?? "Untitled",
          originalFilename: file.name ?? "unknown",
          fileType: file.mimeType ?? "text/plain",
          fileSize: file.size ?? 0,
          content,
          wordCount,
          estimatedDuration,
          language: "en",
          metadata: { tags: [] },
          structure: { chapters: [], frontMatter: [], backMatter: [], hasTableOfContents: false, hasFootnotes: false, hasCitations: false },
        });

        await ProjectService.create({
          userId: user.id,
          name: doc.title,
          documentId: doc.id,
          narrationMode,
          language: "en",
          outputFormat: "mp3",
          quality: "128kbps",
        });

        await NotificationService.create({
          userId: user.id,
          title: "Document Uploaded",
          message: `"${doc.title}" has been uploaded and is ready for conversion.`,
          type: "conversion",
        });
      }

      setProgress(100);
      await NotificationService.create({
        userId: user.id,
        title: "Upload Complete",
        message: `${selectedFiles.length} document(s) uploaded successfully.`,
        type: "conversion",
      });

      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to process files");
      setStep("select");
    }
    setUploading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Upload Document</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {step === "processing" ? (
          <View className="flex-1 items-center justify-center pt-20 gap-6">
            <View className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center">
              <Ionicons name="cloud-upload" size={40} color="#3B82F6" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Processing Documents</Text>
            <Text className="text-sm text-gray-500 text-center">Analyzing, parsing, and preparing your documents for conversion...</Text>
            <View className="w-full">
              <ProgressBar progress={progress} height={8} />
              <Text className="text-center text-sm text-gray-500 mt-2">{progress}%</Text>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={pickFiles}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 items-center my-4 bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800"
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={48} color="#9CA3AF" />
              <Text className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-3">Tap to Select Files</Text>
              <Text className="text-sm text-gray-500 mt-1 text-center">PDF, DOCX, TXT, EPUB, MD, HTML, PPTX, XLSX, CSV, and more</Text>
              <Badge text="Multiple files supported" variant="info" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-2 mb-4">
              <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <Text className="text-sm text-gray-500">or paste a URL</Text>
              <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </View>

            <View className="flex-row gap-2 mb-6">
              <View className="flex-1">
                <Input value={urlInput} onChangeText={setUrlInput} placeholder="https://example.com/article" autoCapitalize="none" keyboardType="url" />
              </View>
              <View className="pt-6">
                <Button title="Add" onPress={handleUrlImport} variant="outline" />
              </View>
            </View>

            {selectedFiles.length > 0 && (
              <>
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Selected Files ({selectedFiles.length})
                </Text>
                <View className="gap-2 mb-6">
                  {selectedFiles.map((file, index) => (
                    <Card key={index}>
                      <View className="flex-row items-center gap-3">
                        <Ionicons name={getFileIcon(file.mimeType, file.name) as any} size={24} color="#3B82F6" />
                        <View className="flex-1 min-w-0">
                          <Text className="font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>{file.name}</Text>
                          <Text className="text-xs text-gray-500">{file.size ? formatFileSize(file.size) : "URL"}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeFile(index)}>
                          <Ionicons name="close-circle" size={22} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))}
                </View>
              </>
            )}

            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Narration Mode</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {NARRATION_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  onPress={() => setNarrationMode(mode.value as NarrationMode)}
                  className={`flex-row items-center px-4 py-2.5 rounded-xl gap-2 ${narrationMode === mode.value ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  <Ionicons name={mode.icon as any} size={16} color={narrationMode === mode.value ? "#fff" : "#6B7280"} />
                  <Text className={`text-sm font-medium ${narrationMode === mode.value ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={`Upload ${selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : "Files"}`}
              onPress={processUpload}
              loading={uploading}
              disabled={selectedFiles.length === 0}
              fullWidth
              size="lg"
              icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
