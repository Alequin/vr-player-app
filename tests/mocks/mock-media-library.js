jest.genMockFromModule("expo-media-library");

import * as MediaLibrary from "expo-media-library";

export const mockMediaLibrary = {
  returnWithoutSelectingAFile: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue(false),
      mockGetPermissionsAsync: jest.spyOn(
        MediaLibrary,
        "requestPermissionsAsync"
      ),
      mockGetAssetsAsync: jest
        .spyOn(MediaLibrary, "getAssetsAsync")
        .mockResolvedValue({
          assets: [
            {
              uri: filePath,
              filename: filePath,
              durationInMinutes: 10,
              modificationTime: new Date("2021-01-01").getTime(),
            },
          ],
        }),
    };
  },
  returnWithASelectedFile: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue(true),
      mockGetAssetsAsync: jest
        .spyOn(MediaLibrary, "getAssetsAsync")
        .mockResolvedValue({
          assets: [
            {
              uri: filePath,
              filename: filePath,
              durationInMinutes: 10,
              modificationTime: new Date("2021-01-01").getTime(),
            },
          ],
        }),
    };
  },
};
