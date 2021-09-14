jest.genMockFromModule("expo-video-thumbnails");

import * as VideoThumbnails from "expo-video-thumbnails";

export const mockVideoThumbnails = {
  ableToLoadThumbnails: (thumbnailsToLoad) => ({
    getThumbnailAsync: jest
      .spyOn(VideoThumbnails, "getThumbnailAsync")
      .mockImplementation(async (videoUriForThumbnail) => {
        return {
          uri: thumbnailsToLoad.find(
            ({ videoUri }) => videoUri === videoUriForThumbnail
          ).thumbnailUri,
        };
      }),
  }),
  failToLoadThumbnails: () => ({
    getThumbnailAsync: jest
      .spyOn(VideoThumbnails, "getThumbnailAsync")
      .mockRejectedValue(new Error("unable to load thumbnail")),
  }),
};
