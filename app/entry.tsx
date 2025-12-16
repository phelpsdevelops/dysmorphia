import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Gender = "male" | "female";

export default function EntryScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = useMemo(() => {
    if (params.date) {
      const d = new Date(params.date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [params.date]);

  const formattedDate = useMemo(() => {
    return `${MONTH_NAMES[initialDate.getMonth()]} ${initialDate.getDate()}, ${initialDate.getFullYear()}`;
  }, [initialDate]);

  // Notes
  const [notes, setNotes] = useState("");

  // Body composition
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState(""); // auto or manual
  const [waterWeight, setWaterWeight] = useState("");

  // Body Fat Mode: auto (Navy) or manual
  const [bodyFatMode, setBodyFatMode] = useState<"auto" | "manual">("manual");

  // Dropdown visibility for BF mode
  const [bfDropdownVisible, setBfDropdownVisible] = useState(false);

  // Measurements
  const [gender, setGender] = useState<Gender>("male");
  const [measurements, setMeasurements] = useState({
    neck: "",
    waist: "",
    hips: "",
    height: "",
    chest: "",
    shoulders: "",
    biceps: "",
    forearms: "",
    wrist: "",
    upperThigh: "",
    lowerThigh: "",
    calves: "",
    hipsFull: "",
  });

  const handleMeasurementChange = (
    field: keyof typeof measurements,
    value: string
  ) => {
    setMeasurements((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate body fat % using U.S. Navy method
  useEffect(() => {
    const neck = parseFloat(measurements.neck);
    const waist = parseFloat(measurements.waist);
    const hips = parseFloat(measurements.hips);
    const height = parseFloat(measurements.height);

    const hasAllRequired =
      !!height && !!waist && !!neck && (gender === "male" || !!hips);

    const log10 = (x: number) => Math.log10(x);
    let bf: number | null = null;

    if (hasAllRequired) {
      try {
        if (gender === "male") {
          if (waist > neck && height > 0) {
            bf =
              86.01 * log10(waist - neck) -
              70.041 * log10(height) +
              36.76;
          }
        } else {
          if (waist + hips > neck && height > 0 && hips) {
            bf =
              163.205 * log10(waist + hips - neck) -
              97.684 * log10(height) -
              78.387;
          }
        }
      } catch (e) {
        bf = null;
      }
    }

    if (
      bf !== null &&
      isFinite(bf) &&
      bf > 0 &&
      bf < 75
    ) {
      const value = bf.toFixed(1);

      // If user hasn't typed anything yet and all measurements are present,
      // auto-switch to Auto mode and set the value.
      if (bodyFatMode === "manual" && !bodyFat) {
        setBodyFatMode("auto");
        setBodyFat(value);
      } else if (bodyFatMode === "auto") {
        setBodyFat(value);
      }
    } else {
      // If in auto mode and formula isn't valid, clear body fat
      if (bodyFatMode === "auto") {
        setBodyFat("");
      }
    }
  }, [
    bodyFatMode,
    gender,
    measurements.neck,
    measurements.waist,
    measurements.hips,
    measurements.height,
    bodyFat,
  ]);

  return (
    <ScrollView style={styles.container} 
    contentContainerStyle={styles.content}>
      {/* Date */}
      <Text style={styles.dateLabel}>{formattedDate}</Text>

      {/* Three side-by-side images */}
      <View style={styles.imagesRow}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageLabel}>Front</Text>
        </View>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageLabel}>Side</Text>
        </View>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageLabel}>Back</Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How did you feel today? Any wins, struggles, or thoughts?"
          placeholderTextColor="#6B7280"
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Body Composition */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Composition</Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Weight (lbs)</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              placeholder="—"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.field}>
            <View style={styles.bfRow}>
              <Text style={styles.fieldLabel}>Body Fat %</Text>

              <Pressable
                style={styles.bfModeButton}
                onPress={() => setBfDropdownVisible(true)}
              >
                <Text style={styles.bfModeArrow}>⌄</Text>
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.fieldInput,
                bodyFatMode === "auto" && styles.fieldInputDisabled,
              ]}
              value={bodyFat}
              editable={bodyFatMode === "manual"}
              onChangeText={setBodyFat}
              keyboardType="numeric"
              placeholder={bodyFatMode === "manual" ? "Enter %" : "Auto"}
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Water %</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={waterWeight}
              onChangeText={setWaterWeight}
              placeholder="—"
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>
      </View>

      {/* Advanced / Measurements */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Advanced</Text>
        <Text style={styles.sectionTitle}>Measurements</Text>

        {/* Gender toggle (for navy formula) */}
        <View style={styles.genderRow}>
          <Text style={styles.fieldLabel}>Gender (for formula)</Text>
          <View style={styles.genderButtons}>
            <Pressable
              style={[
                styles.genderButton,
                gender === "male" && styles.genderButtonActive,
              ]}
              onPress={() => setGender("male")}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === "male" && styles.genderButtonTextActive,
                ]}
              >
                Male
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.genderButton,
                gender === "female" && styles.genderButtonActive,
              ]}
              onPress={() => setGender("female")}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === "female" && styles.genderButtonTextActive,
                ]}
              >
                Female
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Key tape-measure spots including Navy formula fields */}
        <View style={styles.measurementsGrid}>
          <MeasurementField
            label="Neck (in)"
            value={measurements.neck}
            onChangeText={(v) => handleMeasurementChange("neck", v)}
          />
          <MeasurementField
            label="Waist (in)"
            value={measurements.waist}
            onChangeText={(v) => handleMeasurementChange("waist", v)}
          />
          <MeasurementField
            label="Hips (in)"
            value={measurements.hips}
            onChangeText={(v) => handleMeasurementChange("hips", v)}
          />
          <MeasurementField
            label="Height (in)"
            value={measurements.height}
            onChangeText={(v) => handleMeasurementChange("height", v)}
          />

          <MeasurementField
            label="Chest (in)"
            value={measurements.chest}
            onChangeText={(v) => handleMeasurementChange("chest", v)}
          />
          <MeasurementField
            label="Shoulders (in)"
            value={measurements.shoulders}
            onChangeText={(v) => handleMeasurementChange("shoulders", v)}
          />
          <MeasurementField
            label="Biceps (in)"
            value={measurements.biceps}
            onChangeText={(v) => handleMeasurementChange("biceps", v)}
          />
          <MeasurementField
            label="Forearms (in)"
            value={measurements.forearms}
            onChangeText={(v) => handleMeasurementChange("forearms", v)}
          />
          <MeasurementField
            label="Wrist (in)"
            value={measurements.wrist}
            onChangeText={(v) => handleMeasurementChange("wrist", v)}
          />
          <MeasurementField
            label="Upper thigh (in)"
            value={measurements.upperThigh}
            onChangeText={(v) => handleMeasurementChange("upperThigh", v)}
          />
          <MeasurementField
            label="Lower thigh (in)"
            value={measurements.lowerThigh}
            onChangeText={(v) => handleMeasurementChange("lowerThigh", v)}
          />
          <MeasurementField
            label="Calves (in)"
            value={measurements.calves}
            onChangeText={(v) => handleMeasurementChange("calves", v)}
          />
        </View>
      </View>

      {/* Footer quote */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          the thief of joy is comparison, be the best you
        </Text>
      </View>

      {/* Body Fat mode dropdown */}
      {bfDropdownVisible && (
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownBox}>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setBodyFatMode("auto");
                setBfDropdownVisible(false);
              }}
            >
              <Text style={styles.dropdownText}>US Navy Method (Auto)</Text>
            </Pressable>

            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setBodyFatMode("manual");
                setBfDropdownVisible(false);
              }}
            >
              <Text style={styles.dropdownText}>Manual</Text>
            </Pressable>

            <Pressable
              style={styles.dropdownCancel}
              onPress={() => setBfDropdownVisible(false)}
            >
              <Text style={styles.dropdownCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Small reusable measurement input component
type MeasurementFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
};

function MeasurementField({
  label,
  value,
  onChangeText,
}: MeasurementFieldProps) {
  return (
    <View style={styles.measureField}>
      <Text style={styles.measureLabel}>{label}</Text>
      <TextInput
        style={styles.measureInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor="#6B7280"
      />
    </View>
  );
}

const BG = "#050816";
const CARD = "#111827";
const TEXT = "#F9FAFB";
const MUTED = "#9CA3AF";
const ACCENT = "#3B82F6";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // MAIN POSITIONING — everything gets pushed lower
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,   // ⬅️ LOWERED PAGE CONTENT
    paddingBottom: 40,
  },

  // DATE DISPLAY
  dateLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 24,
    textAlign: "center",
  },

  // IMAGE PLACEHOLDERS
  imagesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },
  imagePlaceholder: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    color: MUTED,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // SECTIONS
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 14,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 12,
  },

  // NOTES AREA
  notesInput: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: CARD,
    padding: 14,
    textAlignVertical: "top",
    fontSize: 15,
    color: TEXT,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  // BODY COMPOSITION ROW
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 12,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  fieldInputDisabled: {
    opacity: 0.6,
  },

  // BODY FAT DROPDOWN ARROW
  bfRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bfModeButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CARD,
  },
  bfModeArrow: {
    fontSize: 14,
    color: MUTED,
  },

  // GENDER SELECTION
  genderRow: {
    marginBottom: 14,
  },
  genderButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    backgroundColor: CARD,
  },
  genderButtonActive: {
    backgroundColor: "rgba(59,130,246,0.25)",
    borderColor: ACCENT,
  },
  genderButtonText: {
    fontSize: 14,
    color: MUTED,
  },
  genderButtonTextActive: {
    color: TEXT,
    fontWeight: "600",
  },

  // MEASUREMENTS GRID
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  measureField: {
    width: "47%",
  },
  measureLabel: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 6,
  },
  measureInput: {
    borderRadius: 12,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  // FOOTER QUOTE
  footer: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    opacity: 0.7,
  },

  // DROPDOWN OVERLAY
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownBox: {
    width: "78%",
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 14,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  dropdownText: {
    color: TEXT,
    fontSize: 16,
  },
  dropdownCancel: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "#1F2937",
  },
  dropdownCancelText: {
    color: MUTED,
    fontSize: 14,
  },
});
