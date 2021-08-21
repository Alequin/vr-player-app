import { useRef, useMemo } from "react";
import { delay } from "../../delay";

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
        // Start the second one first as syncing the players is smoother when the second is ahead
        Promise.all([
          secondaryVideo?.current?.playAsync(),
          primaryVideo?.current?.playAsync(),
        ]),

      pause: async () =>
        Promise.all([
          primaryVideo?.current?.pauseAsync(),
          secondaryVideo?.current?.pauseAsync(),
        ]),
      delaySecondary: async (delayTime) => {
        await secondaryVideo?.current?.pauseAsync();
        await delay(delayTime);
        await secondaryVideo?.current?.playAsync();
      },
      setSecondaryRate: async (rate) =>
        secondaryVideo?.current?.setRateAsync(rate),
      setPosition: async (position) =>
        Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]),
      load: async (newFileObject, { primaryOptions, secondaryOptions } = {}) =>
        Promise.all([
          primaryVideo?.current?.loadAsync(newFileObject, primaryOptions),
          secondaryVideo?.current?.loadAsync(newFileObject, secondaryOptions),
        ]),
      unload: async () =>
        Promise.all([
          primaryVideo?.current?.unloadAsync(),
          secondaryVideo?.current?.unloadAsync(),
        ]),
      getStatus: async () => {
        const status = await Promise.all([
          primaryVideo?.current?.getStatusAsync(),
          secondaryVideo?.current?.getStatusAsync(),
        ]);

        return {
          primaryStatus: status?.[0],
          secondaryStatus: status?.[1],
        };
      },
    }),
    [primaryVideo?.current, secondaryVideo?.current]
  );
};
