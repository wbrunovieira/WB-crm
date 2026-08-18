import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOutbox } from "@/lib/outbox";
import { listVisitsForDay, listVisitCountsByDay } from "@/lib/leads";
import { getDailyGoal, setDailyGoal, getGoalHistory, resolveGoalForDay } from "@/lib/goals";

const RECORD_WINDOW_DAYS = 30;

/** "Hoje"/"Ontem" for the first two days back, else a short weekday + dd/mm. */
function dayLabel(daysAgo: number): string {
  if (daysAgo === 0) return "Hoje";
  if (daysAgo === 1) return "Ontem";
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function TodayScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // 0 = today, 1 = yesterday, ... — lets the rep browse prior days' prospecting, not just today's.
  const [daysAgo, setDaysAgo] = useState(0);
  const outboxQuery = useQuery({ queryKey: ["outbox", "list"], queryFn: listOutbox, refetchInterval: 15_000 });
  // Same query key as the home screen's "X/Y hoje" pill when viewing today — shares its cache
  // instead of double-fetching the same data.
  const visitsQuery = useQuery({
    queryKey: daysAgo === 0 ? ["today-visits"] : ["visits-for-day", daysAgo],
    queryFn: () => listVisitsForDay(daysAgo),
    refetchInterval: 30_000,
  });
  const goalQuery = useQuery({ queryKey: ["daily-goal"], queryFn: getDailyGoal });
  // Full goal-change history — each PAST day's streak/record check uses whichever goal was
  // actually in effect THAT day (resolveGoalForDay), not today's current value. Otherwise
  // raising today's goal would retroactively make an already-met past day look like it missed.
  const goalHistoryQuery = useQuery({ queryKey: ["daily-goal-history"], queryFn: getGoalHistory });
  const countsQuery = useQuery({
    queryKey: ["visit-counts", RECORD_WINDOW_DAYS],
    queryFn: () => listVisitCountsByDay(RECORD_WINDOW_DAYS),
    refetchInterval: 30_000,
  });

  const pending = outboxQuery.data ?? [];
  const synced = visitsQuery.data ?? [];
  const goal = goalQuery.data ?? 0;
  const goalHistory = goalHistoryQuery.data ?? {};
  const counts = countsQuery.data ?? [];

  const todayCount = counts.length ? counts[counts.length - 1].count : 0;
  const goalMet = goal > 0 && todayCount >= goal;
  const progress = goal > 0 ? Math.min(1, todayCount / goal) : 0;
  const record = counts.reduce((max, c) => Math.max(max, c.count), 0);

  let streak = 0;
  for (let i = counts.length - 1; i >= 0; i--) {
    // No door-to-door on weekends — skip Sat/Sun entirely, they neither extend nor break it.
    const dow = new Date(`${counts[i].day}T00:00:00`).getDay();
    if (dow === 0 || dow === 6) continue;

    const dayGoal = resolveGoalForDay(counts[i].day, goalHistory);
    const isToday = i === counts.length - 1;
    if (counts[i].count >= dayGoal) {
      streak++;
    } else if (isToday) {
      continue; // today isn't over yet — don't let it zero out an existing streak
    } else {
      break;
    }
  }

  function editGoal() {
    Alert.prompt(
      "Meta diária",
      "Quantas empresas você quer visitar por dia?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salvar",
          onPress: async (value?: string) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) {
              Alert.alert("Meta inválida", "Informe um número maior que zero.");
              return;
            }
            try {
              await setDailyGoal(n);
              queryClient.invalidateQueries({ queryKey: ["daily-goal"] });
              queryClient.invalidateQueries({ queryKey: ["daily-goal-history"] });
            } catch {
              Alert.alert("Erro", "Não foi possível salvar a meta. Tente de novo.");
            }
          },
        },
      ],
      "plain-text",
      goal ? String(goal) : "",
      "number-pad",
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.goalCard, goalMet && styles.goalCardMet]}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{goalMet ? "🎉 Meta batida hoje!" : "🎯 Meta de hoje"}</Text>
          <Pressable onPress={editGoal} hitSlop={8}>
            <Text style={styles.editLink}>✏️ Ajustar</Text>
          </Pressable>
        </View>
        {goalQuery.isLoading || countsQuery.isLoading || goalHistoryQuery.isLoading ? (
          <ActivityIndicator color="#c9b3d6" style={{ marginTop: 8 }} />
        ) : (
          <>
            <Text style={styles.goalCount}>
              {todayCount}
              <Text style={styles.goalCountTotal}> / {goal} empresas</Text>
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, goalMet && styles.progressFillMet, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}</Text>
              <Text style={styles.statText}>🏆 recorde: {record} (últimos {RECORD_WINDOW_DAYS}d)</Text>
            </View>
          </>
        )}
      </View>

      {daysAgo === 0 && (
        <>
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
        </>
      )}

      <View style={[styles.dayNav, styles.sectionSpaced]}>
        <Pressable onPress={() => setDaysAgo((d) => d + 1)} hitSlop={8}>
          <Text style={styles.dayNavArrow}>◀</Text>
        </Pressable>
        <Text style={styles.dayNavLabel}>{dayLabel(daysAgo)}</Text>
        <Pressable onPress={() => setDaysAgo((d) => Math.max(0, d - 1))} disabled={daysAgo === 0} hitSlop={8}>
          <Text style={[styles.dayNavArrow, daysAgo === 0 && styles.dayNavArrowDisabled]}>▶</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>✅ Visitas ({synced.length})</Text>
      {visitsQuery.isLoading && <ActivityIndicator color="#c9b3d6" />}
      {!visitsQuery.isLoading && synced.length === 0 && <Text style={styles.empty}>Nenhuma visita nesse dia.</Text>}
      {synced.map((v) => (
        <Pressable
          key={v.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push(`/lead/${v.leadId}`)}
        >
          <Text style={styles.name}>{v.businessName}</Text>
          {v.completedAt && (
            <Text style={styles.meta}>
              {new Date(v.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          <Text style={styles.badgeOk}>✅ sincronizado</Text>
        </Pressable>
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
  cardPressed: { opacity: 0.7 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "#b79ec6", fontSize: 12, marginTop: 2 },
  badgePending: { color: "#f4c860", fontSize: 12, fontWeight: "700", marginTop: 6 },
  badgeWarn: { color: "#f2a5a5", fontSize: 12, fontWeight: "700", marginTop: 6 },
  badgeOk: { color: "#7ee0a0", fontSize: 12, fontWeight: "700", marginTop: 6 },
  goalCard: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  goalCardMet: { borderColor: "#2f7d4f", backgroundColor: "#14351f" },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  editLink: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  goalCount: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 10 },
  goalCountTotal: { color: "#b79ec6", fontSize: 16, fontWeight: "600" },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1a0022",
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#762991" },
  progressFillMet: { backgroundColor: "#3fae6f" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  statText: { color: "#c9b3d6", fontSize: 12, fontWeight: "600" },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 8,
  },
  dayNavArrow: { color: "#c9b3d6", fontSize: 18, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4 },
  dayNavArrowDisabled: { color: "#4d2b5d" },
  dayNavLabel: { color: "#fff", fontSize: 15, fontWeight: "700", textTransform: "capitalize", minWidth: 110, textAlign: "center" },
});
