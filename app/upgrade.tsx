import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Button, Badge, Divider } from "@/components/ui";
import { useAuthStore } from "@/lib/store/auth";
import { PlanService, UsageService } from "@/services";
import type { Plan, UsageStats, UserRole } from "@/types";

export default function UpgradeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    (async () => {
      const p = await PlanService.getAll();
      setPlans(p);
      if (user) {
        const u = await UsageService.getByUser(user.id);
        setUsage(u);
      }
    })();
  }, []);

  const currentTier = user?.role ?? "free";
  const tierOrder: UserRole[] = ["free", "pro", "business", "admin"];
  const tierIndex = tierOrder.indexOf(currentTier);

  const getPlanAction = (planTier: UserRole): string => {
    const planIdx = tierOrder.indexOf(planTier);
    if (planIdx === tierIndex) return "Current Plan";
    if (planIdx > tierIndex) return "Upgrade";
    return "Downgrade";
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.tier === currentTier) return;
    setSelectedPlan(plan.id);
    setProcessing(true);
    try {
      Alert.alert(
        `${getPlanAction(plan.tier)} to ${plan.name}`,
        billingCycle === "yearly"
          ? `$${(plan.price * 10).toFixed(2)}/year (save 17%)`
          : `$${plan.price.toFixed(2)}/month`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setSelectedPlan(null) },
          {
            text: "Confirm",
            onPress: async () => {
              Alert.alert("Plan Updated", `You are now on the ${plan.name} plan. Payment integration coming soon.`);
              setSelectedPlan(null);
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setProcessing(false);
  };

  const formatLimit = (n: number): string => {
    if (n === -1) return "Unlimited";
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const planIcons: Record<string, string> = {
    free: "leaf-outline",
    pro: "rocket-outline",
    business: "business-outline",
  };

  const planColors: Record<string, string> = {
    free: "#6B7280",
    pro: "#3B82F6",
    business: "#8B5CF6",
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">Plans & Billing</Text>
        {user && <Badge text={user.role.toUpperCase()} variant="info" />}
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {usage && (
          <Card className="mb-4">
            <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Usage</Text>
            <View className="gap-3">
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-500">Characters</Text>
                  <Text className="text-xs text-gray-500">{formatLimit(usage.charactersProcessed)} used</Text>
                </View>
                <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <View className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (usage.charactersProcessed / 50000) * 100)}%` }} />
                </View>
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-500">Audio Minutes</Text>
                  <Text className="text-xs text-gray-500">{usage.audioMinutesGenerated.toFixed(0)} min</Text>
                </View>
                <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <View className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (usage.audioMinutesGenerated / 120) * 100)}%` }} />
                </View>
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-500">Storage</Text>
                  <Text className="text-xs text-gray-500">{(usage.storageUsed / (1024 * 1024)).toFixed(1)} MB</Text>
                </View>
                <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <View className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (usage.storageUsed / (500 * 1024 * 1024)) * 100)}%` }} />
                </View>
              </View>
            </View>
          </Card>
        )}

        <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4 gap-1">
          <TouchableOpacity
            onPress={() => setBillingCycle("monthly")}
            className={`flex-1 py-2 rounded-lg items-center ${billingCycle === "monthly" ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}>
            <Text className={`text-sm font-medium ${billingCycle === "monthly" ? "text-primary-600" : "text-gray-500"}`}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBillingCycle("yearly")}
            className={`flex-1 py-2 rounded-lg items-center ${billingCycle === "yearly" ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}>
            <View className="flex-row items-center gap-1.5">
              <Text className={`text-sm font-medium ${billingCycle === "yearly" ? "text-primary-600" : "text-gray-500"}`}>Yearly</Text>
              <Badge text="Save 17%" variant="success" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            const action = getPlanAction(plan.tier);
            const color = planColors[plan.tier] ?? "#6B7280";
            const icon = planIcons[plan.tier] ?? "card-outline";
            const price = billingCycle === "yearly" ? plan.price * 10 : plan.price;

            return (
              <Card key={plan.id} className={`relative ${isCurrent ? "border-2 border-primary-400" : ""}`}>
                {isCurrent && (
                  <View className="absolute -top-3 left-4 bg-primary-500 px-3 py-0.5 rounded-full">
                    <Text className="text-xs font-bold text-white">CURRENT</Text>
                  </View>
                )}

                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                      <Ionicons name={icon as any} size={24} color={color} />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</Text>
                      <View className="flex-row items-baseline gap-1">
                        <Text className="text-2xl font-bold" style={{ color }}>${price === 0 ? "Free" : price.toFixed(2)}</Text>
                        {price > 0 && <Text className="text-sm text-gray-500">/{billingCycle === "yearly" ? "yr" : "mo"}</Text>}
                      </View>
                    </View>
                  </View>
                </View>

                <Divider className="mb-3" />

                <View className="gap-2 mb-4">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="text" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{formatLimit(plan.characterLimit)} characters/month</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{formatLimit(plan.audioMinuteLimit)} audio minutes/month</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="server" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{formatLimit(plan.storageLimit)} storage</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="mic" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{plan.cloneSlots} voice clone slots</Text>
                  </View>
                  {plan.features.map((feat, i) => (
                    <View key={i} className="flex-row items-center gap-2">
                      <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{feat}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  title={action}
                  onPress={() => handleSelectPlan(plan)}
                  disabled={isCurrent}
                  variant={isCurrent ? "secondary" : action === "Upgrade" ? "primary" : "outline"}
                  fullWidth
                  loading={selectedPlan === plan.id && processing}
                />
              </Card>
            );
          })}
        </View>

        <Card className="mt-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 items-center justify-center">
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Payment Integration</Text>
              <Text className="text-xs text-gray-500">Stripe payment processing will be available soon. For now, plan changes are applied instantly for testing.</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
