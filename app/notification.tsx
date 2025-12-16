import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type FrequencyKey = "daily" | "weekly" | "biweekly" | "monthly" | "custom";

const FREQUENCIES: { key: FrequencyKey; label: string }[] = [
  { key: "daily", label: "Every day" },
  { key: "weekly", label: "Every 7 days" },
  { key: "biweekly", label: "Every 2 weeks" },
  { key: "monthly", label: "Every month" },
  { key: "custom", label: "Custom" },
];

export default function NotificationScreen() {
  // 🔒 Replace later with backend value
  const [hasExistingSchedule] = useState(false);

  const [step, setStep] = useState<"frequency" | "day" | "time">("frequency");

  const [frequency, setFrequency] = useState<FrequencyKey | null>(null);
  const [day, setDay] = useState<string | null>(null);

  // Time picker: hour (1–12) + AM/PM
  const [hour, setHour] = useState<number>(9);
  const [isPM, setIsPM] = useState(false);

  const formattedTime = useMemo(() => {
    if (!hour) return "";
    const ampm = isPM ? "PM" : "AM";
    return `${hour}:00 ${ampm}`;
  }, [hour, isPM]);

  // ✅ Summary text (used later for backend + widgets)
  const summary = useMemo(() => {
    if (!frequency) return "";
    if (frequency === "daily") return `Every day at ${formattedTime}`;
    if (frequency === "weekly")
      return `Every 7 days on ${day} at ${formattedTime}`;
    if (frequency === "biweekly")
      return `Every 2 weeks on ${day} at ${formattedTime}`;
    if (frequency === "monthly")
      return `Every month on ${day} at ${formattedTime}`;
    return `Custom schedule`;
  }, [frequency, day, formattedTime]);

  // ------------------ BACK BUTTON HANDLER ------------------
  const handleBackPress = () => {
    if (step === "time") {
      // If daily, there's no "day" step → go straight back to frequency
      if (frequency === "daily") {
        setStep("frequency");
      } else {
        setStep("day");
      }
    } else if (step === "day") {
      setStep("frequency");
    } else {
      // on frequency step → go back out of this screen
      router.back();
    }
  };

  // ------------------ EXISTING SCHEDULE VIEW ------------------
  if (hasExistingSchedule) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={router.back} hitSlop={10}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Current schedule</Text>
          <Text style={styles.summaryText}>
            Every 7 days on Monday at 9:00 AM
          </Text>
        </View>

        <Pressable
          style={styles.editButton}
          onPress={() => setStep("frequency")}
        >
          <Text style={styles.editButtonText}>Edit schedule</Text>
        </Pressable>
      </View>
    );
  }

  // ------------------ CONFIG FLOW ------------------
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {step !== "frequency" ? (
          <Pressable onPress={handleBackPress} hitSlop={10}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}

        <Text style={styles.title}>Get notified</Text>
        <View style={{ width: 50 }} />
      </View>

      {step === "frequency" && (
        <>
          <Text style={styles.subtitle}>How often?</Text>

          {FREQUENCIES.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.option,
                frequency === f.key && styles.optionActive,
              ]}
              onPress={() => {
                setFrequency(f.key);
                setStep(f.key === "daily" ? "time" : "day");
              }}
            >
              <Text style={styles.optionText}>{f.label}</Text>
            </Pressable>
          ))}
        </>
      )}

      {step === "day" && (
        <>
          <Text style={styles.subtitle}>Which day?</Text>

          <ScrollView>
            {DAYS.map((d) => (
              <Pressable
                key={d}
                style={[styles.option, day === d && styles.optionActive]}
                onPress={() => {
                  setDay(d);
                  setStep("time");
                }}
              >
                <Text style={styles.optionText}>{d}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {step === "time" && (
        <>
          <Text style={styles.subtitle}>What time?</Text>

          {/* iOS-style scroll wheels */}
          <View style={styles.timePickerRow}>
            {/* Hour wheel */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              snapToInterval={40}
              decelerationRate="fast"
              contentContainerStyle={styles.timeWheelContent}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                const value = Math.min(Math.max(index + 1, 1), 12);
                setHour(value);
                Haptics.selectionAsync();
              }}
            >
              {[...Array(12)].map((_, i) => (
                <View key={i} style={styles.timeItem}>
                  <Text
                    style={[
                      styles.timeItemText,
                      hour === i + 1
                        ? styles.timeItemActive
                        : styles.timeItemInactive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* AM / PM wheel */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              snapToInterval={40}
              decelerationRate="fast"
              contentContainerStyle={styles.timeWheelContent}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                const pm = index === 1;
                setIsPM(pm);
                Haptics.selectionAsync();
              }}
            >
              {["AM", "PM"].map((v) => (
                <View key={v} style={styles.timeItem}>
                  <Text
                    style={[
                      styles.timeItemText,
                      (isPM ? "PM" : "AM") === v
                        ? styles.timeItemActive
                        : styles.timeItemInactive,
                    ]}
                  >
                    {v}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <Pressable
            style={styles.saveButton}
            onPress={() => {
              // 🔔 Later:
              // - Save to Supabase
              // - Schedule iOS notification
              router.back();
            }}
          >
            <Text style={styles.saveText}>Save notification</Text>
          </Pressable>

          <Text style={styles.previewText}>{summary}</Text>
        </>
      )}
    </View>
  );
}

// ------------------ STYLES ------------------

const BG = "#050816";
const CARD = "#111827";
const TEXT = "#F9FAFB";
const MUTED = "#9CA3AF";
const ACCENT = "#3B82F6";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backText: {
    color: MUTED,
    fontSize: 14,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: MUTED,
    marginBottom: 12,
  },

  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: CARD,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  optionActive: {
    borderColor: ACCENT,
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  optionText: {
    color: TEXT,
    fontSize: 15,
  },

  // TIME PICKER
  timePickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    height: 200,
    marginBottom: 20,
  },
  timeWheelContent: {
    paddingVertical: 80,
  },
  timeItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timeItemText: {
    fontSize: 20,
    color: MUTED,
  },
  timeItemActive: {
    color: TEXT,
    fontWeight: "700",
    opacity: 1,
  },
  timeItemInactive: {
    opacity: 0.35,
    fontWeight: "400",
  },

  saveButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  saveText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
  },
  previewText: {
    marginTop: 12,
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
  },

  summaryBox: {
    backgroundColor: CARD,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: "center",
  },
  editButtonText: {
    color: ACCENT,
    fontWeight: "600",
  },
});
