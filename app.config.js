import { googleMobileAdsAppId, isPayedVersion } from "./secrets.json";
const version = 1;

export default {
  name: "Watch In VR",
  slug: isPayedVersion ? "alequin-watch-in-vr" : "alequin-watch-in-vr-free",
  version: `${version}.0.0`,
  orientation: "landscape",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: isPayedVersion
      ? "com.just_for_fun.watch_in_vr"
      : "com.just_for_fun.watch_in_vr_free",
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
