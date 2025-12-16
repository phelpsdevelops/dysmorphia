import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: "rgba(0, 0, 0, 0.45)", // soft dark overlay
    justifyContent: "space-between",
  },

  // HEADER
  header: {
    alignItems: "center",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // CENTER BLOCK
  centerBlock: {
    alignItems: "center",
    gap: 12,
  },
  centerLabel: {
    fontSize: 16,
    color: "#E5E7EB",
    textAlign: "center",
  },
  centerNumber: {
    fontSize: 56,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  notifyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38BDF8",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  notifyButtonText: {
    color: "#E0F2FE",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // BOTTOM STATS
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  statBlock: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
  },

  // Last check-in: softer glass card
  statBlockLast: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderColor: "rgba(148, 163, 184, 0.6)",
  },

  // Next check: blue-accent card (still flashes over this)
  statBlockNext: {
    backgroundColor: "rgba(30, 64, 175, 0.7)",
    borderColor: "#60A5FA",
  },

  statLabel: {
    fontSize: 13,
    color: "#D1D5DB",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
