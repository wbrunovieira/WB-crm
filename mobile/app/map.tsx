import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { listLeadsForMap, type LeadMapPin } from "@/lib/leads";

const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

function pinColor(pin: LeadMapPin): string {
  if (pin.quality === "hot") return "#ef4444";
  if (pin.quality === "warm") return "#f4c860";
  return "#c9b3d6";
}

/** Leads-on-a-map view (Apple Maps, no API key/billing — react-native-maps' default provider on
 *  iOS). Only leads with a captured GPS position show up; manual/card captures without one are
 *  invisible here (see listLeadsForMap). */
export default function MapScreen() {
  const router = useRouter();
  const [gpsRegion, setGpsRegion] = useState<Region | null>(null);
  const [locating, setLocating] = useState(true);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const leadsQuery = useQuery({ queryKey: ["leads-map"], queryFn: listLeadsForMap, refetchInterval: 30_000 });
  const pins = leadsQuery.data ?? [];

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return; // fall through to lead-based centering below
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted.current) return;
        setGpsRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, ...DEFAULT_DELTA });
      } catch {
        // Silent fallback (not a user-initiated action, unlike ManualLeadForm's "usar
        // localização" button) — a denied/failed GPS just means centering on leads instead.
      } finally {
        if (mounted.current) setLocating(false);
      }
    })();
  }, []);

  // No GPS (denied/failed)? Center on the most recently captured pin instead — still useful,
  // just not "near me". No GPS AND no pins: nothing to center on, show the empty state.
  const fallbackRegion: Region | undefined = pins.length
    ? { latitude: pins[0].latitude, longitude: pins[0].longitude, ...DEFAULT_DELTA }
    : undefined;
  const initialRegion = gpsRegion ?? fallbackRegion;

  if (locating || leadsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9b3d6" size="large" />
      </View>
    );
  }

  if (leadsQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Não foi possível carregar os leads.</Text>
      </View>
    );
  }

  if (!initialRegion) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Sem localização disponível e nenhum lead com coordenadas ainda. Cadastre um lead pelo GPS ou pelo Google
          para vê-lo aqui.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.businessName}
            description={[pin.city, pin.state].filter(Boolean).join(" - ") || undefined}
            pinColor={pinColor(pin)}
            onPress={() => router.push(`/lead/${pin.id}`)}
          />
        ))}
      </MapView>
      <View style={styles.countPill}>
        <Text style={styles.countPillText}>📍 {pins.length} {pins.length === 1 ? "lead" : "leads"} no mapa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a0022", padding: 24 },
  errorText: { color: "#f2a5a5" },
  emptyText: { color: "#b79ec6", fontSize: 14, textAlign: "center" },
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
