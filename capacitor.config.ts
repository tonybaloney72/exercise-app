import type { CapacitorConfig } from "@capacitor/cli";
import packageJson from "./package.json";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const nativeBuild = process.env.NATIVE_BUILD?.trim() ?? packageJson.version;

const config: CapacitorConfig = {
  appId: "dev.myexercise.app",
  appName: "MyExercise",
  webDir: "out",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0f1117",
      androidSplashResourceName: "splash",
    },
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
        },
      }
    : {}),
};

/** Exposed to native build scripts / future update channel (see ROADMAP). */
void nativeBuild;

export default config;
