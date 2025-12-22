import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

const BUCKET = "progress-photos";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Gender = "male" | "female";
type PhotoSlot = "front" | "side" | "back";

type ImageJson = {
  front?: string; // storage path
  side?: string;
  back?: string;
};

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inchesToCm(inches: string) {
  const n = parseFloat(inches);
  if (!isFinite(n)) return null;
  return Math.round(n * 2.54 * 100) / 100; // 2 decimals
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

function safeParseImageJson(text: string | null | undefined): ImageJson {
  if (!text) return {};
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") return obj as ImageJson;
  } catch {}
  return {};
}

export default function EntryScreen() {
  const params = useLocalSearchParams<{ date?: string }>();

  const initialDate = useMemo(() => {
    if (params.date) {
      const d = new Date(params.date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [params.date]);

  const entryDateKey = useMemo(() => toDateKey(initialDate), [initialDate]);

  const formattedDate = useMemo(() => {
    return `${MONTH_NAMES[initialDate.getMonth()]} ${initialDate.getDate()}, ${initialDate.getFullYear()}`;
  }, [initialDate]);

  const [session, setSession] = useState<Session | null>(null);

  // Loading state for this entry
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notes
  const [notes, setNotes] = useState("");

  // Body composition
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState(""); // auto or manual
  const [waterWeight, setWaterWeight] = useState("");

  // Body Fat Mode: auto (Navy) or manual
  const [bodyFatMode, setBodyFatMode] = useState<"auto" | "manual">("manual");
  const [bfDropdownVisible, setBfDropdownVisible] = useState(false);

  // Measurements (UI is inches)
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

  // Photos (store storage paths; show signed URLs)
  const [imagePaths, setImagePaths] = useState<ImageJson>({});
  const [imageSignedUrls, setImageSignedUrls] = useState<Record<PhotoSlot, string | null>>({
    front: null,
    side: null,
    back: null,
  });

  const handleMeasurementChange = (field: keyof typeof measurements, value: string) => {
    setMeasurements((prev) => ({ ...prev, [field]: value }));
  };

  // Get session once + listen
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load entry from DB for this date
  useEffect(() => {
    const load = async () => {
      if (!session?.user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("progress_logs")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("entry_date", entryDateKey)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setNotes(data.notes ?? "");
          setWeight(data.weight != null ? String(data.weight) : "");
          setBodyFat(data.body_fat_percent != null ? String(data.body_fat_percent) : "");

          // NOTE: your schema doesn’t have water %. We keep it UI-only for now.
          setWaterWeight("");

          // Pull image JSON from image_url
          const img = safeParseImageJson(data.image_url);
          setImagePaths(img);

          // Map DB cm -> UI inches for the fields you actually store
          // DB columns: waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm
          const cmToIn = (cm: number | null) =>
            cm == null ? "" : String(Math.round((cm / 2.54) * 10) / 10);

          setMeasurements((prev) => ({
            ...prev,
            waist: cmToIn(data.waist_cm ?? null),
            hips: cmToIn(data.hip_cm ?? null),
            chest: cmToIn(data.chest_cm ?? null),
            biceps: cmToIn(data.arm_cm ?? null),
            upperThigh: cmToIn(data.thigh_cm ?? null),
          }));
        } else {
          // no row => clear (new entry)
          setNotes("");
          setWeight("");
          setBodyFat("");
          setWaterWeight("");
          setImagePaths({});
          setImageSignedUrls({ front: null, side: null, back: null });
        }
      } catch (e) {
        console.warn("Load progress log failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session?.user?.id, entryDateKey]);

  // Generate signed URLs for display whenever image paths change
  useEffect(() => {
    const makeUrls = async () => {
      const slots: PhotoSlot[] = ["front", "side", "back"];
      const next: Record<PhotoSlot, string | null> = { front: null, side: null, back: null };

      for (const slot of slots) {
        const path = imagePaths[slot];
        if (!path) continue;

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60); // 1 hour

        if (!error && data?.signedUrl) next[slot] = data.signedUrl;
      }

      setImageSignedUrls(next);
    };

    makeUrls();
  }, [imagePaths.front, imagePaths.side, imagePaths.back]);

  // Calculate body fat % using U.S. Navy method
  useEffect(() => {
    const neck = parseFloat(measurements.neck);
    const waist = parseFloat(measurements.waist);
    const hips = parseFloat(measurements.hips);
    const height = parseFloat(measurements.height);

    const hasAllRequired = !!height && !!waist && !!neck && (gender === "male" || !!hips);

    const log10 = (x: number) => Math.log10(x);
    let bf: number | null = null;

    if (hasAllRequired) {
      try {
        if (gender === "male") {
          if (waist > neck && height > 0) {
            bf = 86.01 * log10(waist - neck) - 70.041 * log10(height) + 36.76;
          }
        } else {
          if (waist + hips > neck && height > 0 && hips) {
            bf =
              163.205 * log10(waist + hips - neck) -
              97.684 * log10(height) -
              78.387;
          }
        }
      } catch {
        bf = null;
      }
    }

    if (bf !== null && isFinite(bf) && bf > 0 && bf < 75) {
      const value = bf.toFixed(1);

      if (bodyFatMode === "manual" && !bodyFat) {
        setBodyFatMode("auto");
        setBodyFat(value);
      } else if (bodyFatMode === "auto") {
        setBodyFat(value);
      }
    } else {
      if (bodyFatMode === "auto") setBodyFat("");
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

  async function uploadSlotImage(slot: PhotoSlot, uri: string) {
    if (!session?.user) throw new Error("No session");

    // Path includes date + slot (stable overwrite)
    const fileExt = "jpg";
    const path = `${session.user.id}/${entryDateKey}/${slot}.${fileExt}`;

    const blob = await uriToBlob(uri);

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (error) throw error;

    setImagePaths((prev) => ({ ...prev, [slot]: path }));
  }

  async function pickOrTakePhoto(slot: PhotoSlot, source: "gallery" | "camera") {
    try {
      if (source === "camera") {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          Alert.alert("Camera permission needed", "Enable camera access to take a photo.");
          return;
        }
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libPerm.granted) {
          Alert.alert("Photos permission needed", "Enable photo library access to pick a photo.");
          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              quality: 0.9,
              allowsEditing: true,
              aspect: [3, 4],
            })
          : await ImagePicker.launchImageLibraryAsync({
              quality: 0.9,
              allowsEditing: true,
              aspect: [3, 4],
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      await uploadSlotImage(slot, uri);
    } catch (e) {
      console.warn("Photo pick/take failed:", e);
      Alert.alert("Upload failed", "Could not upload the photo. Try again.");
    }
  }

  async function saveEntry() {
    if (!session?.user) return;

    setSaving(true);
    try {
      const payload = {
        user_id: session.user.id,
        entry_date: entryDateKey,
        notes: notes || null,
        weight: weight ? Number(weight) : null,
        body_fat_percent: bodyFat ? Number(bodyFat) : null,

        // Measurements: UI inches -> DB cm (only the columns you actually have)
        waist_cm: inchesToCm(measurements.waist),
        hip_cm: inchesToCm(measurements.hips),
        chest_cm: inchesToCm(measurements.chest),
        arm_cm: inchesToCm(measurements.biceps),
        thigh_cm: inchesToCm(measurements.upperThigh),

        // Store 3-photo paths as JSON string in image_url
        image_url:
          Object.keys(imagePaths).length > 0 ? JSON.stringify(imagePaths) : null,
      };

      const { error } = await supabase
        .from("progress_logs")
        .upsert(payload, { onConflict: "user_id,entry_date" });

      if (error) throw error;

      Alert.alert("Saved", "Your entry was saved.");
    } catch (e) {
      console.warn("Save failed:", e);
      Alert.alert("Save failed", "Could not save your entry. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator />
        <Text style={{ color: MUTED, marginTop: 10 }}>Loading entry…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date */}
      <Text style={styles.dateLabel}>{formattedDate}</Text>

      {/* Photos: Front / Side / Back */}
      <View style={styles.imagesRow}>
        <PhotoCard
          label="Front"
          uri={imageSignedUrls.front}
          onPick={() => pickOrTakePhoto("front", "gallery")}
          onTake={() => pickOrTakePhoto("front", "camera")}
        />
        <PhotoCard
          label="Side"
          uri={imageSignedUrls.side}
          onPick={() => pickOrTakePhoto("side", "gallery")}
          onTake={() => pickOrTakePhoto("side", "camera")}
        />
        <PhotoCard
          label="Back"
          uri={imageSignedUrls.back}
          onPick={() => pickOrTakePhoto("back", "gallery")}
          onTake={() => pickOrTakePhoto("back", "camera")}
        />
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

              <Pressable style={styles.bfModeButton} onPress={() => setBfDropdownVisible(true)}>
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

        {/* Gender toggle */}
        <View style={styles.genderRow}>
          <Text style={styles.fieldLabel}>Gender (for formula)</Text>
          <View style={styles.genderButtons}>
            <Pressable
              style={[styles.genderButton, gender === "male" && styles.genderButtonActive]}
              onPress={() => setGender("male")}
            >
              <Text style={[styles.genderButtonText, gender === "male" && styles.genderButtonTextActive]}>
                Male
              </Text>
            </Pressable>
            <Pressable
              style={[styles.genderButton, gender === "female" && styles.genderButtonActive]}
              onPress={() => setGender("female")}
            >
              <Text style={[styles.genderButtonText, gender === "female" && styles.genderButtonTextActive]}>
                Female
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.measurementsGrid}>
          <MeasurementField label="Neck (in)" value={measurements.neck} onChangeText={(v) => handleMeasurementChange("neck", v)} />
          <MeasurementField label="Waist (in)" value={measurements.waist} onChangeText={(v) => handleMeasurementChange("waist", v)} />
          <MeasurementField label="Hips (in)" value={measurements.hips} onChangeText={(v) => handleMeasurementChange("hips", v)} />
          <MeasurementField label="Height (in)" value={measurements.height} onChangeText={(v) => handleMeasurementChange("height", v)} />

          <MeasurementField label="Chest (in)" value={measurements.chest} onChangeText={(v) => handleMeasurementChange("chest", v)} />
          <MeasurementField label="Shoulders (in)" value={measurements.shoulders} onChangeText={(v) => handleMeasurementChange("shoulders", v)} />
          <MeasurementField label="Biceps (in)" value={measurements.biceps} onChangeText={(v) => handleMeasurementChange("biceps", v)} />
          <MeasurementField label="Forearms (in)" value={measurements.forearms} onChangeText={(v) => handleMeasurementChange("forearms", v)} />
          <MeasurementField label="Wrist (in)" value={measurements.wrist} onChangeText={(v) => handleMeasurementChange("wrist", v)} />
          <MeasurementField label="Upper thigh (in)" value={measurements.upperThigh} onChangeText={(v) => handleMeasurementChange("upperThigh", v)} />
          <MeasurementField label="Lower thigh (in)" value={measurements.lowerThigh} onChangeText={(v) => handleMeasurementChange("lowerThigh", v)} />
          <MeasurementField label="Calves (in)" value={measurements.calves} onChangeText={(v) => handleMeasurementChange("calves", v)} />
        </View>
      </View>

      {/* Save */}
      <Pressable
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={saveEntry}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Entry"}</Text>
      </Pressable>

      {/* Footer quote */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>the thief of joy is comparison, be the best you</Text>
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

            <Pressable style={styles.dropdownCancel} onPress={() => setBfDropdownVisible(false)}>
              <Text style={styles.dropdownCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function PhotoCard({
  label,
  uri,
  onPick,
  onTake,
}: {
  label: string;
  uri: string | null;
  onPick: () => void;
  onTake: () => void;
}) {
  return (
    <View style={styles.photoCard}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoImage} />
      ) : (
        <View style={styles.imagePlaceholderInner}>
          <Text style={styles.imageLabel}>{label}</Text>
        </View>
      )}

      <View style={styles.photoActions}>
        <Pressable style={styles.photoBtn} onPress={onPick}>
          <Text style={styles.photoBtnText}>Pick</Text>
        </Pressable>
        <Pressable style={styles.photoBtn} onPress={onTake}>
          <Text style={styles.photoBtnText}>Take</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Small reusable measurement input component
function MeasurementField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
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
  container: { flex: 1, backgroundColor: BG },
  loadingCenter: { justifyContent: "center", alignItems: "center" },

  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  dateLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 24,
    textAlign: "center",
  },

  imagesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  photoCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  imagePlaceholderInner: {
    width: "100%",
    aspectRatio: 3 / 4,
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    color: MUTED,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  photoActions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  photoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    backgroundColor: "#0B1020",
  },
  photoBtnText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
  },

  section: { marginBottom: 28 },
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

  row: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  field: { flex: 1 },
  fieldLabel: { fontSize: 13, color: MUTED, marginBottom: 6 },
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
  fieldInputDisabled: { opacity: 0.6 },

  bfRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  bfModeArrow: { fontSize: 14, color: MUTED },

  genderRow: { marginBottom: 14 },
  genderButtons: { flexDirection: "row", gap: 10, marginTop: 6 },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    backgroundColor: CARD,
  },
  genderButtonActive: { backgroundColor: "rgba(59,130,246,0.25)", borderColor: ACCENT },
  genderButtonText: { fontSize: 14, color: MUTED },
  genderButtonTextActive: { color: TEXT, fontWeight: "600" },

  measurementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  measureField: { width: "47%" },
  measureLabel: { fontSize: 13, color: MUTED, marginBottom: 6 },
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

  saveButton: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: ACCENT,
  },
  saveButtonText: { color: TEXT, fontSize: 15, fontWeight: "700" },

  footer: { marginTop: 30, marginBottom: 20, alignItems: "center" },
  footerText: { fontSize: 12, color: MUTED, textAlign: "center", opacity: 0.7 },

  dropdownOverlay: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownBox: { width: "78%", backgroundColor: CARD, borderRadius: 16, paddingVertical: 14 },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 18 },
  dropdownText: { color: TEXT, fontSize: 16 },
  dropdownCancel: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "#1F2937",
  },
  dropdownCancelText: { color: MUTED, fontSize: 14 },
});
