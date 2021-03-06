jest.genMockFromModule("expo-media-library");

import * as MediaLibrary from "expo-media-library";

export const mockMediaLibrary = {
  grantedPermission: () => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),
    };
  },
  singleAsset: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),
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
              duration: 10,
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
  failToLoadAssets: (filePath) => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),
      mockRequestPermissionsAsync: jest
        .spyOn(MediaLibrary, "requestPermissionsAsync")
        .mockResolvedValue({
          granted: true,
          status: "granted",
          canAskAgain: true,
        }),
      mockGetAssetsAsync: jest
        .spyOn(MediaLibrary, "getAssetsAsync")
        .mockRejectedValue(new Error("error loading assets")),
    };
  },
  undeterminedPermissions: () => {
    return {
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({
          granted: false,
          status: "granted",
          canAskAgain: true,
        }),
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
      mockGetPermissionsAsync: jest
        .spyOn(MediaLibrary, "getPermissionsAsync")
        .mockResolvedValue({
          granted: false,
          status: "granted",
          canAskAgain: false,
        }),
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
