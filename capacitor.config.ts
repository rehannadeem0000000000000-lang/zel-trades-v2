import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zel.signals",
  appName: "Zel Signals",
  webDir: "out",
  backgroundColor: "#070b14",
  plugins: {
    // Routes fetch() through the native HTTP stack so data providers and AI APIs work without CORS limits.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
