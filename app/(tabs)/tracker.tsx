import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { Link } from "expo-router";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
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

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarDays(year: number, month: number) {
  // month: 0–11
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { date: Date; inCurrentMonth: boolean }[] = [];

  // leading days from previous month
  for (let i = 0; i < firstWeekday; i++) {
    const date = new Date(year, month, i - firstWeekday + 1);
    days.push({ date, inCurrentMonth: false });
  }

  // current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({ date, inCurrentMonth: true });
  }

  // trailing days to fill 6 rows of 7 days = 42 cells
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    days.push({ date: next, inCurrentMonth: false });
  }

  return days;
}

export default function TrackerScreen() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [displayedMonth, setDisplayedMonth] = useState<number>(
    today.getMonth()
  );
  const [displayedYear, setDisplayedYear] = useState<number>(
    today.getFullYear()
  );
  const [pickerVisible, setPickerVisible] = useState(false);

  // Week strip based on selected date
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  // Calendar grid for displayed month/year
  const calendarDays = useMemo(
    () => getCalendarDays(displayedYear, displayedMonth),
    [displayedYear, displayedMonth]
  );

  // Year options: currentYear-2 through currentYear+4 (7 years rolling)
  const currentYear = today.getFullYear();
  const yearOptions = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => currentYear - 2 + i),
    [currentYear]
  );

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setDisplayedMonth(date.getMonth());
    setDisplayedYear(date.getFullYear());
  };

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    handleSelectDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    handleSelectDate(d);
  };

  const handleMonthYearChange = (month: number, year: number) => {
    setDisplayedMonth(month);
    setDisplayedYear(year);

    // If selected date is not in this month, move it to the 1st of new month
    const newSelected = new Date(year, month, 1);
    setSelectedDate(newSelected);
  };

  const formattedSelected = useMemo(() => {
    return `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      {/* Month + week strip */}
      <View style={styles.topSection}>
        <View style={styles.monthHeaderRow}>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>

          <Pressable
            style={styles.monthPickerButton}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={styles.monthPickerText}>Change month</Text>
          </Pressable>
        </View>

        <View style={styles.weekStripRow}>
          <Pressable onPress={handlePrevWeek} style={styles.arrowButton}>
            <Text style={styles.arrowText}>{"<"}</Text>
          </Pressable>

          <View style={styles.weekStrip}>
            {weekDays.map((date, index) => {
              const isSelected = isSameDay(date, selectedDate);
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.weekDayItem,
                    isSelected && styles.weekDayItemSelected,
                  ]}
                  onPress={() => handleSelectDate(date)}
                >
                  <Text style={styles.weekDayLabel}>
                    {DAY_LABELS[date.getDay()]}
                  </Text>
                  <View style={styles.dotWrapper}>
                    <View
                      style={[
                        styles.dayDot,
                        isSelected && styles.dayDotSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayDotText,
                          isSelected && styles.dayDotTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleNextWeek} style={styles.arrowButton}>
            <Text style={styles.arrowText}>{">"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeaderRow}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.calendarHeaderLabel}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map(({ date, inCurrentMonth }, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <Pressable
                key={idx}
                style={[
                  styles.calendarCell,
                  isSelected && styles.calendarCellSelected,
                ]}
                onPress={() => handleSelectDate(date)}
              >
                <Text
                  style={[
                    styles.calendarCellText,
                    !inCurrentMonth && styles.calendarCellTextFaded,
                    isSelected && styles.calendarCellTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Add entry button */}
      <View style={styles.bottomSection}>
        <Text style={styles.selectedDateLabel}>Selected date</Text>
        <Text style={styles.selectedDateValue}>{formattedSelected}</Text>

        <Link
  href={{
    pathname: "/entry",
    params: { date: selectedDate.toISOString() },
  }}
  asChild
>
  <Pressable style={styles.addEntryButton}>
    <Text style={styles.addEntryText}>
      Add entry for {formattedSelected}
    </Text>
  </Pressable>
</Link>

      </View>

      {/* Month/Year picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Jump to month</Text>

            <View style={styles.modalContentRow}>
              {/* Months list */}
              <ScrollView style={styles.monthList}>
                {MONTH_NAMES.map((name, idx) => (
                  <Pressable
                    key={name}
                    style={[
                      styles.monthItem,
                      idx === displayedMonth && styles.monthItemSelected,
                    ]}
                    onPress={() =>
                      handleMonthYearChange(idx, displayedYear)
                    }
                  >
                    <Text
                      style={[
                        styles.monthItemText,
                        idx === displayedMonth && styles.monthItemTextSelected,
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Years list */}
              <ScrollView style={styles.yearList}>
                {yearOptions.map((year) => (
                  <Pressable
                    key={year}
                    style={[
                      styles.yearItem,
                      year === displayedYear && styles.yearItemSelected,
                    ]}
                    onPress={() =>
                      handleMonthYearChange(displayedMonth, year)
                    }
                  >
                    <Text
                      style={[
                        styles.yearItemText,
                        year === displayedYear && styles.yearItemTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const NEUTRAL_BG = "#0B0B10";
const CARD_BG = "#14151C";
const MUTED = "#9CA3AF";
const TEXT = "#F9FAFB";
const ACCENT = "#3B82F6";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEUTRAL_BG,
    paddingTop: 90,        // ⬅️ was 50 — move EVERYTHING further down
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topSection: {
    marginBottom: 20,
    // optional: you can also add marginTop here instead of paddingTop on container
    // marginTop: 20,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT,
  },
  monthPickerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
  },
  monthPickerText: {
    fontSize: 12,
    color: MUTED,
  },
  weekStripRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CARD_BG,
  },
  arrowText: {
    color: TEXT,
    fontSize: 18,
  },
  weekStrip: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: CARD_BG,
  },
  weekDayItem: {
    alignItems: "center",
    flex: 1,
  },
  weekDayItemSelected: {},
  weekDayLabel: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 4,
  },
  dotWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  dayDotSelected: {
    borderStyle: "solid",
    borderColor: ACCENT,
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  dayDotText: {
    fontSize: 12,
    color: TEXT,
  },
  dayDotTextSelected: {
    fontWeight: "700",
    color: TEXT,
  },

  // ⬇️ CALENDAR BLOCK – pushed further down & feels more centered
  calendarSection: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 12,
    marginTop: 40,     // ⬅️ add space between week strip and calendar
    marginBottom: 24,  // ⬅️ a bit more breathing room above bottom section
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarHeaderLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: MUTED,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
  },
  calendarCellSelected: {
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  calendarCellText: {
    fontSize: 13,
    color: TEXT,
  },
  calendarCellTextFaded: {
    color: "#6B7280",
  },
  calendarCellTextSelected: {
    fontWeight: "700",
  },

  bottomSection: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  selectedDateLabel: {
    fontSize: 12,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  selectedDateValue: {
    fontSize: 14,
    color: TEXT,
    marginBottom: 8,
  },
  addEntryButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: ACCENT,
  },
  addEntryText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 12,
  },
  modalContentRow: {
    flexDirection: "row",
    gap: 12,
  },
  monthList: {
    flex: 2,
  },
  yearList: {
    flex: 1,
  },
  monthItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  monthItemSelected: {
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  monthItemText: {
    color: TEXT,
    fontSize: 14,
  },
  monthItemTextSelected: {
    fontWeight: "700",
  },
  yearItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  yearItemSelected: {
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  yearItemText: {
    color: TEXT,
    fontSize: 13,
  },
  yearItemTextSelected: {
    fontWeight: "700",
  },
  modalCloseButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  modalCloseText: {
    color: TEXT,
    fontSize: 13,
  },
});
