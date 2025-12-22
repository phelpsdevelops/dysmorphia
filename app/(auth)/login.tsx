import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const signUp = async () => {
  try {
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) return Alert.alert("Sign up failed", error.message);

    const userId = data.user?.id;
    if (!userId) {
      return Alert.alert(
        "Sign up incomplete",
        "No user returned. If email confirmation is enabled, check your inbox."
      );
    }

    // Create profile row (matches your RLS: id must equal auth.uid())
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      plan: "free",
    });

    if (profileErr) return Alert.alert("Profile create failed", profileErr.message);

    Alert.alert("Account created", "Now try Sign In.");
  } catch (e: any) {
    Alert.alert("Network/Unexpected error", e?.message ?? "Something went wrong.");
  } finally {
    setLoading(false);
  }
};


  const signIn = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) return Alert.alert("Sign in failed", error.message);
    } catch (e: any) {
      Alert.alert("Network/Unexpected error", e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Dysmorphia</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        autoCorrect={false}
        style={styles.input}
      />

      <Pressable style={styles.btn} onPress={signIn} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Working..." : "Sign In"}</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.btnOutline]} onPress={signUp} disabled={loading}>
        <Text style={styles.btnText}>Create Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050816", padding: 24, justifyContent: "center", gap: 12 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 6 },
  input: {
    color: "#fff",
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 10,
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(148,163,184,0.25)" },
  btnText: { color: "#fff", fontWeight: "700" },
});
