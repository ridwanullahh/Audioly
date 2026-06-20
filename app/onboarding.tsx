import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui";
import { useLocalStorage } from "@/lib/performance";

const { width } = Dimensions.get("window");

const slides = [
  {
    icon: "document-text" as const,
    color: "#3B82F6",
    title: "Upload Any Document",
    description: "PDF, DOCX, EPUB, TXT, images, web articles — Audioly handles it all. Even scanned documents with our AI-powered OCR.",
  },
  {
    icon: "mic" as const,
    color: "#8B5CF6",
    title: "Choose Your Voice & Style",
    description: "Pick from 16+ professional voices across languages, or clone your own voice. Choose narration modes from straight reading to podcast-style.",
  },
  {
    icon: "headset" as const,
    color: "#10B981",
    title: "Listen Anytime, Anywhere",
    description: "Download audiobooks for offline listening. Adjustable speed, bookmarks, sleep timer, and a beautiful player that keeps your place.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setOnboarded] = useLocalStorage("onboarded", false);

  const handleFinish = async () => {
    await setOnboarded(true);
    router.replace("/(auth)/register");
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-32 h-32 rounded-full items-center justify-center mb-8" style={{ backgroundColor: slide.color + "20" }}>
          <Ionicons name={slide.icon} size={64} color={slide.color} />
        </View>

        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-4">{slide.title}</Text>
        <Text className="text-base text-gray-500 dark:text-gray-400 text-center leading-6">{slide.description}</Text>

        <View className="flex-row items-center justify-center gap-2 mt-12 mb-8">
          {slides.map((_, i) => (
            <View key={i} className={`h-2 rounded-full ${i === currentSlide ? "w-8 bg-primary-500" : "w-2 bg-gray-300 dark:bg-gray-600"}`} />
          ))}
        </View>

        <View className="w-full gap-3">
          {currentSlide < slides.length - 1 ? (
            <>
              <Button title="Next" onPress={() => setCurrentSlide(currentSlide + 1)} fullWidth size="lg" />
              <TouchableOpacity onPress={handleFinish} className="items-center py-2">
                <Text className="text-sm text-gray-500">Skip</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Button title="Get Started" onPress={handleFinish} fullWidth size="lg" icon={<Ionicons name="arrow-forward" size={20} color="#fff" />} />
              <TouchableOpacity onPress={() => router.replace("/(auth)/login")} className="items-center py-2">
                <Text className="text-sm text-primary-600">Already have an account? Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
