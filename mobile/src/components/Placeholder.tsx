import { View, Text, StyleSheet } from "react-native";

/** Simple "coming soon" screen used by the not-yet-built capture modes in Fase 0. */
export function Placeholder({ emoji, title, phase }: { emoji: string; title: string; phase: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.phase}>Em breve — {phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  emoji: { fontSize: 44 },
  title: { color: "#fff", fontSize: 20, fontWeight: "600" },
  phase: { color: "#b79ec6", fontSize: 14 },
});
