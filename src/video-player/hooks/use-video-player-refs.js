import { useRef, useMemo } from "react";

/**
 * A mockable wrapper for video player functions exposed by references
 *
 * Functions here should remain simple and avoid logic.
 * Write any required logic in "use-paired-video-players"
 */
export const useVideoPlayerRefs = () => {
  const primaryVideo = useRef(null);
  const secondaryVideo = useRef(null);

  return useMemo(
    () => ({
      refs: { primaryVideo, secondaryVideo },
      play: async () =>
        Promise.all([
          primaryVideo?.current?.playAsync(),
          secondaryVideo?.current?.playAsync(),
        ]),
      pause: async () =>
        Promise.all([
          primaryVideo?.current?.pauseAsync(),
          secondaryVideo?.current?.pauseAsync(),
        ]),
      setPosition: async (position) =>
        Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]),
      load: async (newFileObject, { primaryOptions, secondaryOptions } = {}) =>
        Promise.all([
          primaryVideo?.current?.loadAsync(newFileObject, primaryOptions || {}),
          secondaryVideo?.current?.loadAsync(
            newFileObject,
            secondaryOptions || {}
          ),
        ]),
      unload: async () =>
        Promise.all([
          primaryVideo?.current?.unloadAsync(),
          secondaryVideo?.current?.unloadAsync(),
        ]),
      getStatus: async () => {
        const status = await primaryVideo?.current?.getStatusAsync();

        return status
          ? { isStatusAvailable: true, ...status }
          : { isStatusAvailable: false };
      },
    }),
    [primaryVideo?.current, secondaryVideo?.current]
  );
};
