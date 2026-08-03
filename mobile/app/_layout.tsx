import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiError } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't waste a retry on auth failures — a bad/expired token won't fix itself.
      retry: (failureCount, error) =>
        error instanceof ApiError && (error.status === 401 || error.status === 403) ? false : failureCount < 1,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#792990" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#1a0022" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "WB Prospecção" }} />
          <Stack.Screen name="google" options={{ title: "Google Meus Negócios" }} />
          <Stack.Screen name="card" options={{ title: "Cartão / Panfleto" }} />
          <Stack.Screen name="gps" options={{ title: "Endereço por GPS" }} />
          <Stack.Screen name="manual" options={{ title: "Cadastro manual" }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
