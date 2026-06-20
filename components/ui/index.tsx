import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, View, type ViewStyle } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variants = {
  primary: "bg-primary-600 active:bg-primary-700",
  secondary: "bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600",
  outline: "border-2 border-primary-600 bg-transparent active:bg-primary-50 dark:active:bg-primary-950",
  ghost: "bg-transparent active:bg-gray-100 dark:active:bg-gray-800",
  danger: "bg-red-500 active:bg-red-600",
};

const textVariants = {
  primary: "text-white",
  secondary: "text-gray-900 dark:text-gray-100",
  outline: "text-primary-600",
  ghost: "text-gray-700 dark:text-gray-300",
  danger: "text-white",
};

const sizes = {
  sm: "px-3 py-1.5 rounded-lg",
  md: "px-5 py-2.5 rounded-xl",
  lg: "px-7 py-3.5 rounded-xl",
};

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({ title, onPress, variant = "primary", size = "md", loading, disabled, icon, fullWidth, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-50" : ""} flex-row items-center justify-center gap-2`}
      style={style}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#3B82F6"} size="small" />
      ) : (
        <>
          {icon}
          <Text className={`${textVariants[variant]} ${textSizes[size]} font-semibold`}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, error, multiline, numberOfLines, keyboardType, autoCapitalize, editable = true, style }: {
  label?: string; value: string; onChangeText: (text: string) => void; placeholder?: string;
  secureTextEntry?: boolean; error?: string; multiline?: boolean; numberOfLines?: number;
  keyboardType?: any; autoCapitalize?: any; editable?: boolean; style?: ViewStyle;
}) {
  const { TextInput } = require("react-native");
  return (
    <View className="w-full gap-1.5" style={style}>
      {label && <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        className={`bg-gray-50 dark:bg-gray-800 border ${error ? "border-red-400" : "border-gray-200 dark:border-gray-700"} rounded-xl px-4 py-3 text-base text-gray-900 dark:text-gray-100 ${multiline ? "min-h-[100px]" : ""}`}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {error && <Text className="text-sm text-red-500">{error}</Text>}
    </View>
  );
}

export function Card({ children, style, className = "" }: { children: React.ReactNode; style?: ViewStyle; className?: string }) {
  return (
    <View className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`} style={style}>
      {children}
    </View>
  );
}

export function Badge({ text, variant = "default" }: { text: string; variant?: "default" | "success" | "warning" | "error" | "info" }) {
  const colors = {
    default: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    success: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
    warning: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
    error: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    info: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  };
  return (
    <View className={`${colors[variant]} px-2.5 py-0.5 rounded-full self-start`}>
      <Text className="text-xs font-medium">{text}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string }) {
  const { Image } = require("react-native");
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View className="bg-primary-500 items-center justify-center" style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Text className="text-white font-bold" style={{ fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: string; title: string; message?: string; action?: React.ReactNode }) {
  const { Ionicons } = require("@expo/vector-icons");
  return (
    <View className="flex-1 items-center justify-center p-8 gap-4">
      {icon && <Ionicons name={icon} size={64} color="#9CA3AF" />}
      <Text className="text-xl font-semibold text-gray-700 dark:text-gray-300 text-center">{title}</Text>
      {message && <Text className="text-base text-gray-500 dark:text-gray-400 text-center">{message}</Text>}
      {action}
    </View>
  );
}

export function ProgressBar({ progress, height = 6, className = "" }: { progress: number; height?: number; className?: string }) {
  return (
    <View className={`bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`} style={{ height }}>
      <View className="bg-primary-500 rounded-full h-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
    </View>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <View className={`h-px bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</Text>
      {action}
    </View>
  );
}
