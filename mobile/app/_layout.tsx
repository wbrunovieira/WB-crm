import { useEffect} from "react";
import { CompanyProvider, useBrand } from "@/theme/CompanyContext";
import type { BrandColors } from "@/theme";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/query-client";
import { drainOutbox } from "@/lib/outbox";

/**
 * Wires every trigger that should attempt to flush the offline outbox: a NetInfo
 * connectivity-regained event, a periodic safety-net poll (iOS suspends JS timers/listeners
 * while backgrounded, so a reconnect event can be missed entirely), a foreground transition,
 * and once on cold start in case items were left over from a previous session.
 */
function OutboxDrainListener() {
  const c = useBrand();
  useEffect(() => {
    drainOutbox();

    const netSub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) drainOutbox();
    });
    const appStateSub = AppState.addEventListener("change", (s) => {
      if (s === "active") drainOutbox();
    });
    const interval = setInterval(drainOutbox, 60_000);

    return () => {
      netSub();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, []);

  return null;
}

export default function RootLayout() {
  // O Provider precisa envolver quem usa useBrand — por isso a navegação é um filho.
  return (
    <CompanyProvider>
      <RootNav />
    </CompanyProvider>
  );
}

function RootNav() {
  const c = useBrand();
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <OutboxDrainListener />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.accent },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: "WB Prospecção" }} />
          <Stack.Screen name="google" options={{ title: "Google Meus Negócios" }} />
          <Stack.Screen name="confirm-lead" options={{ title: "Confirmar lead" }} />
          <Stack.Screen name="card" options={{ title: "Cartão / Panfleto" }} />
          <Stack.Screen name="gps" options={{ title: "Endereço por GPS" }} />
          <Stack.Screen name="manual" options={{ title: "Cadastro manual" }} />
          <Stack.Screen name="partner" options={{ title: "Parceiro" }} />
          <Stack.Screen name="today" options={{ title: "Meus cadastros do dia" }} />
          <Stack.Screen name="today-visits" options={{ title: "Visitas do dia" }} />
          <Stack.Screen name="lead-search" options={{ title: "Buscar" }} />
          <Stack.Screen name="lead/[id]" options={{ title: "Lead" }} />
          <Stack.Screen name="org/[id]" options={{ title: "Empresa" }} />
          <Stack.Screen name="activity/[id]" options={{ title: "Atividade" }} />
          <Stack.Screen name="map" options={{ title: "Mapa de leads" }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
