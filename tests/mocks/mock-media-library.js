jest.genMockFromModule("expo-media-library");

import * as MediaLibrary from "expo-media-library";

export const mockMediaLibrary = {
  singleAsset: (filePath) => {
    return {
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),
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
  multipleAssets: (mockAssets) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),

      mockGetAssetsAsync: jest
        .spyOn(MediaLibrary, "getAssetsAsync")
        .mockResolvedValue({
          assets: mockAssets,
        }),
    };
  },
  undeterminedPermissions: () => {
    return {
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue({
          granted: false,
          status: "undetermined",
          canAskAgain: true,
        }),
    };
  },
  rejectedPermissions: () => {
    return {
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue({
          granted: false,
          status: "denied",
          canAskAgain: false,
        }),
    };
  },
};
