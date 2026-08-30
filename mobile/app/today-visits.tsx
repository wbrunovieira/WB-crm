import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking, Alert } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { listScheduledVisitsForDay, resolveTodayVisitPins, type TodayScheduledVisit } from "@/lib/visits";

const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
const LEAD_COLOR = "#14b8a6"; // same teal the web CRM uses for physical_visit activities
const ORG_COLOR = "#f59e0b";

function typeIcon(type: string): string {
  return type === "meeting" ? "🤝" : "📍";
}

function dayOffsetDate(dayOffset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

/** "Hoje"/"Ontem"/"Amanhã" for the adjacent days, else a short weekday + dd/mm — same labeling
 *  convention as today.tsx's day navigator, extended to also cover future days (positive
 *  dayOffset) since scheduled visits/meetings can be due tomorrow or later, unlike that
 *  screen's synced-visits history which only ever looks backward. */
function dayLabel(dayOffset: number): string {
  if (dayOffset === 0) return "Hoje";
  if (dayOffset === -1) return "Ontem";
  if (dayOffset === 1) return "Amanhã";
  return dayOffsetDate(dayOffset).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** `tel:` needs the leading "+" to be recognized as international — same fix as lead/[id].tsx. */
function telHref(raw: string): string {
  return `tel:${raw.trim().startsWith("+") ? "+" : ""}${digits(raw)}`;
}

function dueTime(dueDate: string | null): string | null {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Everything pending on a given day, leads + organizations — list mode (default) or map mode,
 *  with a ◀ ▶ navigator to browse other days (past = overdue/already handled, future = upcoming). */
export default function TodayVisitsScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "map">("list");
  const [dayOffset, setDayOffset] = useState(0);
  const [gpsRegion, setGpsRegion] = useState<Region | null>(null);
  const [locating, setLocating] = useState(true);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const visitsQuery = useQuery({
    // Same key the home hub's pill would use for today (dayOffset 0) — shares its cache.
    queryKey: dayOffset === 0 ? ["today-scheduled-visits"] : ["scheduled-visits-for-day", dayOffset],
    queryFn: () => listScheduledVisitsForDay(dayOffset),
    refetchInterval: 30_000,
  });
  const visits = visitsQuery.data ?? [];

  // Only geocode organization addresses (Fase 2's geocodeAddress) when the rep actually switches
  // to map mode — no point spending on-device geocoding calls for a screen they may never open.
  const pinsQuery = useQuery({
    queryKey: ["scheduled-visits-pins", dayOffset, visits.map((v) => v.activityId).join(",")],
    queryFn: () => resolveTodayVisitPins(visits),
    enabled: mode === "map" && visits.length > 0,
    // Addresses/coordinates don't change within a workday for this screen's purpose — a long
    // staleTime keeps toggling list/map back and forth from re-hammering the on-device geocoder.
    staleTime: 5 * 60_000,
  });
  const pins = pinsQuery.data ?? [];

  useEffect(() => {
    if (mode !== "map") return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted.current) return;
        setGpsRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, ...DEFAULT_DELTA });
      } catch {
        // Silent — same convention as map.tsx: not a user-initiated action, just falls back below.
      } finally {
        if (mounted.current) setLocating(false);
      }
    })();
  }, [mode]);

  function openOrgActions(v: TodayScheduledVisit) {
    const buttons: { text: string; onPress?: () => void; style?: "cancel" }[] = [];
    if (v.phone) buttons.push({ text: "📞 Ligar", onPress: () => Linking.openURL(telHref(v.phone!)) });
    if (v.whatsapp) buttons.push({ text: "💬 WhatsApp", onPress: () => Linking.openURL(`https://wa.me/${digits(v.whatsapp!)}`) });
    buttons.push({ text: "Fechar", style: "cancel" });
    Alert.alert(v.name, v.subject, buttons);
  }

  function onSelect(v: { kind: string; entityId: string }) {
    if (v.kind === "lead") {
      router.push(`/lead/${v.entityId}`);
    }
    // Organizations have no mobile detail screen yet — handled inline (list: card actions,
    // map: openOrgActions via marker press) instead of navigating anywhere.
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tab, mode === "list" && styles.tabActive]}
          onPress={() => setMode("list")}
        >
          <Text style={[styles.tabText, mode === "list" && styles.tabTextActive]}>📋 Lista</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "map" && styles.tabActive]}
          onPress={() => setMode("map")}
        >
          <Text style={[styles.tabText, mode === "map" && styles.tabTextActive]}>🗺️ Mapa</Text>
        </Pressable>
      </View>

      <View style={styles.dayNav}>
        <Pressable onPress={() => setDayOffset((d) => d - 1)} hitSlop={8}>
          <Text style={styles.dayNavArrow}>◀</Text>
        </Pressable>
        <Text style={styles.dayNavLabel}>{dayLabel(dayOffset)}</Text>
        <Pressable onPress={() => setDayOffset((d) => d + 1)} hitSlop={8}>
          <Text style={styles.dayNavArrow}>▶</Text>
        </Pressable>
      </View>

      {mode === "list" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {visitsQuery.isLoading && <ActivityIndicator color="#c9b3d6" style={{ marginTop: 24 }} />}
          {visitsQuery.isError && <Text style={styles.errorText}>Não foi possível carregar as visitas de hoje.</Text>}
          {!visitsQuery.isLoading && !visitsQuery.isError && visits.length === 0 && (
            <Text style={styles.emptyText}>Nada agendado para hoje.</Text>
          )}
          {visits.map((v) => (
            <Pressable
              key={v.activityId}
              style={({ pressed }) => [styles.card, pressed && v.kind === "lead" && styles.cardPressed]}
              onPress={() => onSelect(v)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {typeIcon(v.type)} {v.name}
                </Text>
                <View style={[styles.kindBadge, v.kind === "lead" ? styles.kindBadgeLead : styles.kindBadgeOrg]}>
                  <Text style={styles.kindBadgeText}>{v.kind === "lead" ? "Lead" : "Cliente"}</Text>
                </View>
              </View>
              <Text style={styles.cardSubject}>{v.subject}</Text>
              {dueTime(v.dueDate) && <Text style={styles.cardMeta}>⏰ {dueTime(v.dueDate)}</Text>}
              {(v.phone || v.whatsapp) && (
                <View style={styles.orgActions}>
                  {v.phone && (
                    <Pressable onPress={() => Linking.openURL(telHref(v.phone!))} hitSlop={8}>
                      <Text style={styles.orgActionIcon}>📞</Text>
                    </Pressable>
                  )}
                  {v.whatsapp && (
                    <Pressable onPress={() => Linking.openURL(`https://wa.me/${digits(v.whatsapp!)}`)} hitSlop={8}>
                      <Text style={styles.orgActionIcon}>💬</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <MapModeContent
          locating={locating}
          gpsRegion={gpsRegion}
          pinsLoading={visitsQuery.isLoading || pinsQuery.isLoading}
          pins={pins}
          visitsCount={visits.length}
          onSelect={onSelect}
          onOrgPress={openOrgActions}
          visits={visits}
        />
      )}
    </View>
  );
}

function MapModeContent({
  locating,
  gpsRegion,
  pinsLoading,
  pins,
  visitsCount,
  onSelect,
  onOrgPress,
  visits,
}: {
  locating: boolean;
  gpsRegion: Region | null;
  pinsLoading: boolean;
  pins: Array<{ activityId: string; kind: string; entityId: string; name: string; subject: string; latitude: number; longitude: number }>;
  visitsCount: number;
  onSelect: (v: { kind: string; entityId: string }) => void;
  onOrgPress: (v: TodayScheduledVisit) => void;
  visits: TodayScheduledVisit[];
}) {
  const fallbackRegion: Region | undefined = pins.length
    ? { latitude: pins[0].latitude, longitude: pins[0].longitude, ...DEFAULT_DELTA }
    : undefined;
  const initialRegion = gpsRegion ?? fallbackRegion;

  if (locating || pinsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9b3d6" size="large" />
      </View>
    );
  }

  if (visitsCount === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Nada agendado para hoje.</Text>
      </View>
    );
  }

  if (!initialRegion) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Sem localização disponível e nenhuma das visitas de hoje tem coordenadas.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
        {pins.map((pin) => {
          const visit = visits.find((v) => v.activityId === pin.activityId);
          return (
            <Marker
              key={pin.activityId}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              title={pin.name}
              description={pin.subject}
              pinColor={pin.kind === "lead" ? LEAD_COLOR : ORG_COLOR}
              onPress={() => (pin.kind === "lead" ? onSelect(pin) : visit && onOrgPress(visit))}
            />
          );
        })}
      </MapView>
      <View style={styles.countPill}>
        <Text style={styles.countPillText}>
          {pins.length} de {visitsCount} no mapa
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 8 },
  tab: {
    flex: 1,
    alignItems: "center",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: "#762991", borderColor: "#762991" },
  tabText: { color: "#c9b3d6", fontWeight: "600", fontSize: 14 },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 12,
  },
  dayNavArrow: { color: "#c9b3d6", fontSize: 18, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4 },
  dayNavLabel: { color: "#fff", fontSize: 15, fontWeight: "700", textTransform: "capitalize", minWidth: 110, textAlign: "center" },
  tabTextActive: { color: "#fff" },
  listContent: { padding: 16, paddingTop: 8, gap: 10 },
  errorText: { color: "#f2a5a5", textAlign: "center", marginTop: 24 },
  emptyText: { color: "#8a6d9c", textAlign: "center", marginTop: 24, paddingHorizontal: 24 },
  card: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 14, padding: 14 },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1 },
  cardSubject: { color: "#b79ec6", fontSize: 13, marginTop: 4 },
  cardMeta: { color: "#8a6d9c", fontSize: 12, marginTop: 6 },
  kindBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  kindBadgeLead: { backgroundColor: "#0d3b36", borderColor: LEAD_COLOR },
  kindBadgeOrg: { backgroundColor: "#3a2e12", borderColor: ORG_COLOR },
  kindBadgeText: { color: "#e9dcf0", fontSize: 11, fontWeight: "700" },
  orgActions: { flexDirection: "row", gap: 16, marginTop: 10 },
  orgActionIcon: { fontSize: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a0022", padding: 24 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  countPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  countPillText: { color: "#e9dcf0", fontSize: 12, fontWeight: "600" },
});
