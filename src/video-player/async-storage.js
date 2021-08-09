import AsyncStorage from "@react-native-async-storage/async-storage";

const newStorageItem = (storageKey) => ({
  save: async (valueToSave) => {
    AsyncStorage.setItem(storageKey, JSON.stringify(valueToSave));
  },
  load: async () => {
    const item = await AsyncStorage.getItem(storageKey);
    return item ? JSON.parse(item) : null;
  },
  clear: async () => AsyncStorage.removeItem(storageKey),
});

export const adsDisabledTime = newStorageItem("AD_DISABLE_TIME");
