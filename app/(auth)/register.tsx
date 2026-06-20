import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { Button, Input } from "@/components/ui";
import { APP_NAME } from "@/constants";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!name || !email || !password) { setError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    try {
      await register(name, email, password);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="px-8 items-center">
            <View className="w-16 h-16 rounded-2xl bg-primary-500 items-center justify-center mb-6">
              <Ionicons name="person-add" size={32} color="#fff" />
            </View>

            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Create Account</Text>
            <Text className="text-sm text-gray-500 mb-8">Join {APP_NAME} and start converting documents to audio</Text>

            <View className="w-full gap-4 mb-6">
              <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min 8 characters" secureTextEntry />
              <Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry />
              {error ? <Text className="text-sm text-red-500 text-center">{error}</Text> : null}
            </View>

            <Button title="Create Account" onPress={handleRegister} loading={isLoading} fullWidth size="lg" />

            <View className="flex-row items-center gap-2 mt-6">
              <Text className="text-sm text-gray-500">Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text className="text-sm text-primary-600 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
