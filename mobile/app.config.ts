import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo config. Injects the CRM JWT + API URL from the environment (see .env.example)
 * into `extra`, so no secret is ever hardcoded in versioned source. Locally the values
 * come from a gitignored `.env`; for EAS builds they come from EAS secrets of the same name.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "WB Prospecção",
  slug: "wb-crm-mobile",
  scheme: "wbcrm",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  // App icon = WB Digital Solutions mark (white on brand purple). Generated from the
  // official logo.svg of the wbdigitalsolutionsnextjsthreejs project. See assets/icon.svg.
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.wbdigitalsolutions.crmprospect",
    icon: "./assets/icon.png",
  },
  android: {
    package: "com.wbdigitalsolutions.crmprospect",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#762991",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-status-bar",
    [
      "expo-splash-screen",
      {
        // WB mark (white) centered on brand purple as the launch screen.
        image: "./assets/adaptive-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#762991",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "O app usa sua localização para encontrar negócios próximos para prospecção.",
      },
    ],
  ],
  extra: {
    // Read at build/start time from the environment; never committed.
    crmJwt: process.env.CRM_JWT ?? "",
    apiUrl: process.env.CRM_API_URL ?? "https://crm-api.wbdigitalsolutions.com",
  },
});
