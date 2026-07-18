module.exports = ({ config }) => ({
  ...config,
  name: "Chofer de Reemplazo",
  slug: "app",
  owner: "ztefanohs-team",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "choferdereemplazo",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  // TODO: agregar ./assets/icon.png (1024x1024) y descomentar antes de
  // compilar con EAS — ver docs/SETUP.md.
  splash: {
    backgroundColor: "#111827",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/8824ad6e-52bb-4427-af9b-5dd7f80fde5e",
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Permitir que la app use tu ubicación para asignarte viajes cercanos y compartir tu posición con el cliente mientras el viaje está activo.",
      },
    ],
  ],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.choferdereemplazo.app",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Usamos tu ubicación para mostrar el mapa, calcular la tarifa y compartir tu posición durante el viaje.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Los choferes necesitan compartir su ubicación en tiempo real durante un viaje activo.",
    },
  },
  android: {
    package: "com.choferdereemplazo.app",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      },
    },
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "8824ad6e-52bb-4427-af9b-5dd7f80fde5e",
    },
  },
});
