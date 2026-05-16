import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { WebAlertHost } from "@/components/WebAlertHost";
import { LoadingProvider } from "@/context/LoadingContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { prefetchGoshipLocations } from "@/lib/goshipLocations";
import { ensureSessionFromStoredTokens } from "@/lib/sessionHydrate";
import { setOrientationByCurrentRole } from "@/utils/orientation";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSessionFromStoredTokens();
      if (cancelled) return;
      setOrientationByCurrentRole();
      prefetchGoshipLocations();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <LoadingProvider>
            <WebAlertHost />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="home" options={{ headerShown: false }} />
              <Stack.Screen name="store-home" options={{ headerShown: false }} />
              <Stack.Screen name="factory-home" options={{ headerShown: false }} />
              <Stack.Screen
                name="factory-home-simple"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
            </Stack>
          </LoadingProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
