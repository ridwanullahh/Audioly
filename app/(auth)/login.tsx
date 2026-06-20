import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Input } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/constants";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="px-8 items-center">
            <View className="w-20 h-20 rounded-3xl bg-primary-500 items-center justify-center mb-6 shadow-lg">
              <Ionicons name="headset" size={40} color="#fff" />
            </View>

            <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{APP_NAME}</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400 mb-8">{APP_TAGLINE}</Text>

            <View className="w-full gap-4 mb-6">
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={error ? undefined : ""} />
              <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />
              {error ? <Text className="text-sm text-red-500 text-center">{error}</Text> : null}
            </View>

            <Button title="Sign In" onPress={handleLogin} loading={isLoading} fullWidth size="lg" />

            <TouchableOpacity onPress={() => {}} className="mt-4">
              <Text className="text-sm text-primary-600">Forgot password?</Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-2 mt-8">
              <Text className="text-sm text-gray-500">Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text className="text-sm text-primary-600 font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
