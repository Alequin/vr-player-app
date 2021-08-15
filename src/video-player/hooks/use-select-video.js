import * as DocumentPicker from "expo-document-picker";
import { useCallback } from "react";

export const useSelectVideo = (videoPlayer) => {
  return useCallback(async () => {
    videoPlayer.clearError();

    // Select and load new video
    const selectedVideo = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
    });

    if (selectedVideo.type === "cancel") return;
    await videoPlayer.loadVideoSource(selectedVideo);
  }, [videoPlayer.loadVideoSource, videoPlayer.clearError]);
};
