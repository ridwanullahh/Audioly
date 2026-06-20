import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center p-8">
          <Ionicons name="warning" size={64} color="#F59E0B" />
          <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 text-center">Something went wrong</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity onPress={this.handleReset} className="mt-6 bg-primary-500 px-8 py-3 rounded-xl">
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export function CrashReporter() {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    const error = args.find((a) => a instanceof Error);
    if (error) {
      logCrash(error);
    }
  };
}

async function logCrash(error: Error) {
  try {
    const { getDatabase } = require("@/db/database");
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO crash_logs (id, message, stack, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [crypto.randomUUID(), error.message, error.stack ?? ""]
    );
  } catch {}
}
