import { Stack } from "expo-router";

export default function DocumentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="upload" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
