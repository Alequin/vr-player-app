import { useState, useCallback, useEffect } from "react";
import { videoSortOrder } from "../../../async-storage";

const SORT_INSTRUCTIONS = [
  { key: "modificationTime", order: "desc", description: "Newest to oldest" },
  { key: "modificationTime", order: "asc", description: "Oldest to newest" },
  { key: "filename", order: "asc", description: "A to Z" },
  { key: "filename", order: "desc", description: "Z to A" },
  { key: "duration", order: "desc", description: "Longest to shortest" },
  { key: "duration", order: "asc", description: "Shortest to longest" },
].map((instruction, index) => ({
  ...instruction,
  index,
}));

export const useSelectVideoSortOrder = () => {
  const [videoSortInstructions, setVideoSortInstructions] = useState(
    SORT_INSTRUCTIONS[0]
  );

  useEffect(() => {
    videoSortOrder.load().then((instructionsIndex) => {
      const loadedVideoSortInstructions = SORT_INSTRUCTIONS[instructionsIndex];
      if (loadedVideoSortInstructions)
        setVideoSortInstructions(loadedVideoSortInstructions);
    });
  }, []);

  return {
    videoSortInstructions,
    toggleVideoSortInstructions: useCallback(() =>
      setVideoSortInstructions(({ index: currentSortInstructionsIndex }) => {
        const nextInstructions =
          SORT_INSTRUCTIONS[currentSortInstructionsIndex + 1] ||
          SORT_INSTRUCTIONS[0];

        videoSortOrder.save(nextInstructions.index);

        return nextInstructions;
      })
    ),
  };
};
