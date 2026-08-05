import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { listOutbox } from "@/lib/outbox";
import { listTodayVisits } from "@/lib/leads";

export default function TodayScreen() {
  const outboxQuery = useQuery({ queryKey: ["outbox", "list"], queryFn: listOutbox, refetchInterval: 15_000 });
  const visitsQuery = useQuery({ queryKey: ["today-visits"], queryFn: listTodayVisits, refetchInterval: 30_000 });

  const pending = outboxQuery.data ?? [];
  const synced = visitsQuery.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>⏳ Pendentes de sincronização ({pending.length})</Text>
      {pending.length === 0 && <Text style={styles.empty}>Nada pendente.</Text>}
      {pending.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.body.businessName}</Text>
          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
          <Text style={item.attempts > 0 ? styles.badgeWarn : styles.badgePending}>
            {item.attempts > 0 ? `⚠️ com erro (${item.attempts}x)` : "⏳ pendente"}
          </Text>
        </View>
      ))}

      <Text style={[styles.section, styles.sectionSpaced]}>✅ Sincronizados hoje ({synced.length})</Text>
      {visitsQuery.isLoading && <ActivityIndicator color="#c9b3d6" />}
      {!visitsQuery.isLoading && synced.length === 0 && <Text style={styles.empty}>Nada sincronizado ainda hoje.</Text>}
      {synced.map((v) => (
        <View key={v.id} style={styles.card}>
          <Text style={styles.name}>{v.businessName}</Text>
          {v.completedAt && (
            <Text style={styles.meta}>
              {new Date(v.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          <Text style={styles.badgeOk}>✅ sincronizado</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  section: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sectionSpaced: { marginTop: 24 },
  empty: { color: "#8a6d9c", fontSize: 13, marginBottom: 8 },
  card: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "#b79ec6", fontSize: 12, marginTop: 2 },
  badgePending: { color: "#f4c860", fontSize: 12, fontWeight: "700", marginTop: 6 },
  badgeWarn: { color: "#f2a5a5", fontSize: 12, fontWeight: "700", marginTop: 6 },
  badgeOk: { color: "#7ee0a0", fontSize: 12, fontWeight: "700", marginTop: 6 },
});
