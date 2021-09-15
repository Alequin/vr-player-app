import * as VideoThumbnails from "expo-video-thumbnails";

export const videoThumbnail = async (videoUri, videoDuration) => {
  const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: videoDuration / 2,
  });
  return uri;
};
