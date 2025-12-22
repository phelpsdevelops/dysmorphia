import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import "react-native-reanimated";

import type { Session } from "@supabase/supabase-js";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";

// Optional: choose where web anchor starts
export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Load session on app start
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (!error) setSession(data.session);
      setReady(true);
    });

    // Listen for login/logout changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Avoid redirects until router segments are ready
 if (!ready || !segments) return null;

const inAuthGroup = useMemo(() => segments[0] === "(auth)", [segments]);



  // If not logged in, force auth screens
  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // If logged in, keep them out of auth screens
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
