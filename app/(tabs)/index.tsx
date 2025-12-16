import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ImageBackground,
  Animated,
  Pressable,
} from "react-native";
import { Link } from "expo-router";
import { styles } from "./index.styles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  // 🔒 Temporary placeholder data (later from tracker / backend)
  const today = new Date();

  const lastCheckInDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 2); // mock: last check-in 2 days ago
    return d;
  }, [today]);

  const nextCheckInDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 3); // mock: next check in 3 days
    return d;
  }, [today]);

  const daysSinceBestYou = 27;

  const daysSinceLast = Math.max(
    0,
    Math.floor((today.getTime() - lastCheckInDate.getTime()) / 86400000)
  );

  const daysUntilNext = Math.max(
    0,
    Math.ceil((nextCheckInDate.getTime() - today.getTime()) / 86400000)
  );

  // title deform animation
  const deformAnim = useRef(new Animated.Value(0)).current;

  // urgency flash animation (next check = today)
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(deformAnim, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(deformAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (daysUntilNext === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [daysUntilNext, flashAnim]);

  const titleAnimatedStyle = {
    transform: [
      {
        scaleX: deformAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1.2, 0.8, 1],
        }),
      },
      {
        scaleY: deformAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.7, 1.2, 1],
        }),
      },
      {
        rotate: deformAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["-6deg", "0deg"],
        }),
      },
    ],
  };

  // 🔥 Flash between two blue-ish accent shades
  const flashingBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(30, 64, 175, 0.65)", "rgba(56, 189, 248, 0.9)"],
  });

  const backgroundSource = {
    uri: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg",
  };

  return (
    <ImageBackground
      source={backgroundSource}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Animated.Text style={[styles.appName, titleAnimatedStyle]}>
            dysmorphia
          </Animated.Text>
        </View>

        {/* Center timer */}
        <View style={styles.centerBlock}>
          <Text style={styles.centerLabel}>
            Days since working towards the best YOU
          </Text>
          <Text style={styles.centerNumber}>{daysSinceBestYou}</Text>

          {/* Get notified button */}
          <Link href="/notification" asChild>
            <Pressable style={styles.notifyButton}>
              <Text style={styles.notifyButtonText}>Get notified</Text>
            </Pressable>
          </Link>
        </View>

        {/* Bottom stats */}
        <View style={styles.bottomRow}>
          {/* LEFT — Last check-in */}
          <Link
            href={{
              pathname: "/entry",
              params: { date: lastCheckInDate.toISOString() },
            }}
            asChild
          >
            <Pressable style={[styles.statBlock, styles.statBlockLast]}>
              <Text style={styles.statLabel}>Last check-in</Text>
              <Text style={styles.statValue}>
                {daysSinceLast} day{daysSinceLast !== 1 && "s"} ago
              </Text>
            </Pressable>
          </Link>

          {/* RIGHT — Next check */}
          <Link
            href={{
              pathname: "/entry",
              params: { date: nextCheckInDate.toISOString() },
            }}
            asChild
          >
            <AnimatedPressable
              style={[
                styles.statBlock,
                styles.statBlockNext,
                daysUntilNext === 0 && { backgroundColor: flashingBg },
              ]}
            >
              <Text style={styles.statLabel}>Next check</Text>
              <Text style={styles.statValue}>
                {daysUntilNext === 0
                  ? "Today"
                  : `${daysUntilNext} day${
                      daysUntilNext !== 1 ? "s" : ""
                    }`}
              </Text>
            </AnimatedPressable>
          </Link>
        </View>
      </View>
    </ImageBackground>
  );
}
