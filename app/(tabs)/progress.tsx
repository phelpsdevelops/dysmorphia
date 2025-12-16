import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

const TEXT = "#F9FAFB";
const BG = "#050816";
const CARD = "#111111";
const MUTED = "#9CA3AF";

const PURPLE = "#C084FC";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";

type RangeKey =
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "last7"
  | "last28"
  | "last365"
  | "all"
  | "custom";

const RANGE_LABELS: Record<RangeKey, string> = {
  thisWeek: "This Week",
  thisMonth: "This Month",
  thisYear: "This Year",
  last7: "Last 7 Days",
  last28: "Last 28 Days",
  last365: "Last 365 Days",
  all: "All Time",
  custom: "Custom",
};

type ProgressEntry = {
  date: string; // ISO
  weight?: number;
  bodyFat?: number;
  waterPercent?: number;
};

// TEMP MOCK DATA – replace later with real entries (from storage / backend)
const MOCK_ENTRIES: ProgressEntry[] = [
  { date: "2025-11-01", weight: 230, bodyFat: 25, waterPercent: 50 },
  { date: "2025-11-08", weight: 227, bodyFat: 24.5, waterPercent: 51 },
  { date: "2025-11-15", weight: 224, bodyFat: 24, waterPercent: 52 },
  { date: "2025-11-22", weight: 222, bodyFat: 23.5, waterPercent: 52.5 },
  { date: "2025-11-29", weight: 220, bodyFat: 23, waterPercent: 53 },
  { date: "2025-12-05", weight: 218, bodyFat: 22.5, waterPercent: 53.5 },
];

function parseISO(d: string) {
  return new Date(d);
}

function getStartDateForRange(range: RangeKey): Date | null {
  const today = new Date();
  const d = new Date(today);

  switch (range) {
    case "thisWeek": {
      const day = d.getDay(); // 0–6
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "thisMonth":
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case "thisYear":
      return new Date(d.getFullYear(), 0, 1);
    case "last7":
      d.setDate(d.getDate() - 7);
      return d;
    case "last28":
      d.setDate(d.getDate() - 28);
      return d;
    case "last365":
      d.setDate(d.getDate() - 365);
      return d;
    case "all":
      return null; // means "use full history"
    case "custom":
      // for future: custom picker
      return null;
  }
}

function formatShort(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getDelta(current?: number, previous?: number) {
  if (current == null || previous == null) return null;
  const raw = current - previous;
  return Number(raw.toFixed(1));
}

// ----------------- MAIN SCREEN -----------------

export default function ProgressScreen() {
  const [range, setRange] = useState<RangeKey>("thisWeek");
  const [rangeModalVisible, setRangeModalVisible] = useState(false);

  // expanded states for all three cards
  const [weightExpanded, setWeightExpanded] = useState(true);
  const [bodyFatExpanded, setBodyFatExpanded] = useState(false);
  const [waterExpanded, setWaterExpanded] = useState(false);

  // sort entries by date asc
  const sortedEntries = useMemo(
    () =>
      [...MOCK_ENTRIES].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      ),
    []
  );

  // filter by selected range
  const filtered = useMemo(() => {
    const start = getStartDateForRange(range);
    if (!start) return sortedEntries;

    return sortedEntries.filter(
      (e) => parseISO(e.date).getTime() >= start.getTime()
    );
  }, [sortedEntries, range]);

  const latest =
    filtered[filtered.length - 1] ??
    sortedEntries[sortedEntries.length - 1];
  const prev =
    filtered[filtered.length - 2] ??
    sortedEntries[sortedEntries.length - 2];

  const weightDelta = getDelta(latest?.weight, prev?.weight);
  const bodyFatDelta = getDelta(latest?.bodyFat, prev?.bodyFat);
  const waterDelta = getDelta(latest?.waterPercent, prev?.waterPercent);

  // graph data (all three)
  const weightPoints = filtered
    .filter((e) => e.weight != null)
    .map((e) => ({ x: parseISO(e.date), y: e.weight as number }));

  const bodyFatPoints = filtered
    .filter((e) => e.bodyFat != null)
    .map((e) => ({ x: parseISO(e.date), y: e.bodyFat as number }));

  const waterPoints = filtered
    .filter((e) => e.waterPercent != null)
    .map((e) => ({ x: parseISO(e.date), y: e.waterPercent as number }));

  const chartWidth = Dimensions.get("window").width - 32;
  const chartHeight = 180;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section title */}
        <Text style={styles.sectionTitle}>Body Composition</Text>

        {/* WEIGHT CARD */}
        <MetricCard
          label="Weight"
          unit="lb"
          value={latest?.weight}
          delta={weightDelta}
          color={PURPLE}
          onToggleExpand={() => setWeightExpanded((v) => !v)}
          expanded={weightExpanded}
        >
          {weightPoints.length >= 2 && (
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: weightPoints.map((p) => formatShort(p.x)),
                  datasets: [{ data: weightPoints.map((p) => p.y) }],
                }}
                width={chartWidth}
                height={chartHeight}
                withVerticalLines={false}
                withHorizontalLines={false}
                withDots
                chartConfig={{
                  backgroundColor: CARD,
                  backgroundGradientFrom: CARD,
                  backgroundGradientTo: CARD,
                  decimalPlaces: 1,
                  color: () => PURPLE,
                  labelColor: () => MUTED,
                  propsForDots: {
                    r: "4",
                  },
                }}
                style={styles.chart}
                bezier
              />
            </View>
          )}
        </MetricCard>

        {/* BODY FAT CARD */}
        <MetricCard
          label="Body Fat Percentage"
          unit="%"
          value={latest?.bodyFat}
          delta={bodyFatDelta}
          color={GREEN}
          onToggleExpand={() => setBodyFatExpanded((v) => !v)}
          expanded={bodyFatExpanded}
        >
          {bodyFatPoints.length >= 2 && (
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: bodyFatPoints.map((p) => formatShort(p.x)),
                  datasets: [{ data: bodyFatPoints.map((p) => p.y) }],
                }}
                width={chartWidth}
                height={chartHeight}
                withVerticalLines={false}
                withHorizontalLines={false}
                withDots
                chartConfig={{
                  backgroundColor: CARD,
                  backgroundGradientFrom: CARD,
                  backgroundGradientTo: CARD,
                  decimalPlaces: 1,
                  color: () => GREEN,
                  labelColor: () => MUTED,
                  propsForDots: {
                    r: "4",
                  },
                }}
                style={styles.chart}
                bezier
              />
            </View>
          )}
        </MetricCard>

        {/* WATER CARD */}
        <MetricCard
          label="Water Percentage"
          unit="%"
          value={latest?.waterPercent}
          delta={waterDelta}
          color={YELLOW}
          onToggleExpand={() => setWaterExpanded((v) => !v)}
          expanded={waterExpanded}
        >
          {waterPoints.length >= 2 && (
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: waterPoints.map((p) => formatShort(p.x)),
                  datasets: [{ data: waterPoints.map((p) => p.y) }],
                }}
                width={chartWidth}
                height={chartHeight}
                withVerticalLines={false}
                withHorizontalLines={false}
                withDots
                chartConfig={{
                  backgroundColor: CARD,
                  backgroundGradientFrom: CARD,
                  backgroundGradientTo: CARD,
                  decimalPlaces: 1,
                  color: () => YELLOW,
                  labelColor: () => MUTED,
                  propsForDots: {
                    r: "4",
                  },
                }}
                style={styles.chart}
                bezier
              />
            </View>
          )}
        </MetricCard>

        {/* You can add more sections later (Total Inches, per-measurement, etc.) */}
      </ScrollView>

      {/* COMPARE BAR */}
      <View style={styles.compareBarContainer}>
        <Pressable
          style={styles.compareBar}
          onPress={() => setRangeModalVisible(true)}
        >
          <Text style={styles.compareIcon}>⇆</Text>
          <Text style={styles.compareLabel}>COMPARE TO</Text>
          <Text style={styles.compareRange}>{RANGE_LABELS[range]}</Text>
        </Pressable>
      </View>

      {/* RANGE MODAL / BOTTOM SHEET */}
      <Modal
        visible={rangeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRangeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>CHOOSE START DATE</Text>
              <Pressable onPress={() => setRangeModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.rangeGrid}>
              {(
                ["last7", "last28", "last365", "all", "custom"] as RangeKey[]
              ).map((key) => (
                <Pressable
                  key={key}
                  style={[
                    styles.rangeChip,
                    range === key && styles.rangeChipActive,
                  ]}
                  onPress={() => {
                    setRange(key);
                    // for now custom behaves like "all"
                    if (key !== "custom") {
                      setRangeModalVisible(false);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.rangeChipText,
                      range === key && styles.rangeChipTextActive,
                    ]}
                  >
                    {RANGE_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {range === "custom" && (
              <Text style={styles.customHint}>
                Custom date picker coming later – currently shows all time.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ------------- MetricCard component -------------

type MetricCardProps = {
  label: string;
  unit: string;
  value?: number;
  delta: number | null;
  color: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
};

function MetricCard({
  label,
  unit,
  value,
  delta,
  color,
  expanded,
  onToggleExpand,
  children,
}: MetricCardProps) {
  const hasDelta = delta !== null;
  const isUp = (delta ?? 0) < 0; // e.g. weight going DOWN is “good”
  const deltaSign = !hasDelta ? "" : delta === 0 ? "0" : Math.abs(delta ?? 0);

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.cardLabel}>{label.toUpperCase()}</Text>
          <Text style={[styles.cardValue, { color }]}>
            {value != null ? value.toFixed(1) : "—"}
            <Text style={styles.cardUnit}>{unit}</Text>
          </Text>
        </View>

        <View style={styles.cardRight}>
          {hasDelta ? (
            <View style={styles.deltaPill}>
              <Text style={styles.deltaArrow}>
                {delta === 0 ? "=" : isUp ? "↓" : "↑"}
              </Text>
              <Text style={styles.deltaValue}>
                {deltaSign}
                {unit}
              </Text>
            </View>
          ) : (
            <View style={styles.deltaPill}>
              <Text style={styles.deltaValue}>—</Text>
            </View>
          )}

          {onToggleExpand && (
            <Pressable
              style={styles.expandButton}
              onPress={onToggleExpand}
              hitSlop={8}
            >
              <Text style={styles.expandIcon}>{expanded ? "⌃" : "⌄"}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {expanded && children && (
        <View style={styles.cardChartArea}>{children}</View>
      )}
    </View>
  );
}

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 120, // leave space for compare bar
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 16,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  cardUnit: {
    fontSize: 16,
    color: TEXT,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1F2933",
  },
  deltaArrow: {
    marginRight: 4,
    color: TEXT,
    fontSize: 12,
  },
  deltaValue: {
    color: TEXT,
    fontSize: 13,
  },
  expandButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  expandIcon: {
    color: TEXT,
    fontSize: 14,
  },

  cardChartArea: {
    marginTop: 12,
  },
  chartWrapper: {
    marginTop: 4,
  },
  chart: {
    borderRadius: 16,
  },

  compareBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20, // sits above tab bar
    alignItems: "center",
  },
  compareBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 10,
  },
  compareIcon: {
    color: TEXT,
    fontSize: 16,
  },
  compareLabel: {
    color: TEXT,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  compareRange: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "600",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#020617",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    color: TEXT,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  modalClose: {
    color: MUTED,
    fontSize: 18,
  },
  rangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  rangeChipActive: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  rangeChipText: {
    color: TEXT,
    fontSize: 14,
  },
  rangeChipTextActive: {
    color: "#000000",
    fontWeight: "600",
  },
  customHint: {
    marginTop: 12,
    fontSize: 12,
    color: MUTED,
  },
});
