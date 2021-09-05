jest.genMockFromModule("expo-media-library");

import * as MediaLibrary from "expo-media-library";

export const mockMediaLibrary = {
  returnWithoutSelectingAFile: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({ granted: true }),
      mockRequestPermissionsAsync: jest.spyOn(
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
  // TODO rename
  returnWithASelectedFile: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({ granted: true }),
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue(undefined),
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
  returnWithMultipleFileOptions: (mockAssets) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({ granted: true }),

      mockGetAssetsAsync: jest
        .spyOn(MediaLibrary, "getAssetsAsync")
        .mockResolvedValue({
          assets: mockAssets,
        }),
    };
  },
  withoutPermissions: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({ granted: false }),
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue(undefined),
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
