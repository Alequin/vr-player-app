jest.genMockFromModule("expo-video-thumbnails");

import * as VideoThumbnails from "expo-video-thumbnails";

export const mockVideoThumbnails = (thumbnailsToLoad) => {
  return {
    getThumbnailAsync: jest
      .spyOn(VideoThumbnails, "getThumbnailAsync")
      .mockImplementation(async (videoUriForThumbnail) => {
        return {
          uri: thumbnailsToLoad.find(
            ({ videoUri }) => videoUri === videoUriForThumbnail
          ).thumbnailUri,
        };
      }),
  };
};
