import * as useVideoPlayerRefs from "../src/video-player/hooks/use-video-player-refs";

export const mockUseVideoPlayerRefs = () => {
  const mockVideoPlayerRefs = {
    refs: {
      primaryVideo: { current: null },
      secondaryVideo: { current: null },
    },
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    setPosition: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn().mockImplementation(async () => ({
      isStatusAvailable: true,
      positionMillis: 0,
      durationMillis: 1000,
    })),
  };

  return {
    spy: jest
      .spyOn(useVideoPlayerRefs, "useVideoPlayerRefs")
      .mockReturnValue(mockVideoPlayerRefs),
    mocks: mockVideoPlayerRefs,
  };
};