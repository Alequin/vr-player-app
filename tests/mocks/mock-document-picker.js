jest.genMockFromModule("expo-document-picker");

import * as DocumentPicker from "expo-document-picker";

export const mockDocumentPicker = {
  returnWithoutSelectingAFile: () =>
    jest
      .spyOn(DocumentPicker, "getDocumentAsync")
      .mockResolvedValue({ type: "cancel" }),
  returnWithASelectedFile: (filePath) =>
    jest
      .spyOn(DocumentPicker, "getDocumentAsync")
      .mockResolvedValue({
        name: filePath || "path/to/file",
        uri: filePath || "path/to/file",
      }),
};
