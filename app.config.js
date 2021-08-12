import { googleMobileAdsAppId } from "./secrets.json";
const version = 1;

export default {
  name: "vr-player",
  slug: "vr-player",
  version: `${version}.0.0`,
  orientation: "landscape",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.just_for_fun.vr_player",
    permissions: [], // Use minimum permissions (https://docs.expo.dev/versions/latest/config/app/#permissions)
    versionCode: version,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    config: {
      googleMobileAdsAppId,
    },
  },
};
