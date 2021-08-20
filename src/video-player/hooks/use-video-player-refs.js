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
      delayPrimary: async (delayTime) => {
        await primaryVideo?.current?.pauseAsync();
        await delay(delayTime);
        await primaryVideo?.current?.playAsync();
      },
      delaySecondary: async (delayTime) => {
        await secondaryVideo?.current?.pauseAsync();
        await delay(delayTime);
        await secondaryVideo?.current?.playAsync();
      },
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
        const status = await Promise.all([
          primaryVideo?.current?.getStatusAsync(),
          secondaryVideo?.current?.getStatusAsync(),
        ]);

        return {
          isStatusAvailable: Boolean(status),
          primaryStatus: status?.[0] || {},
          secondaryStatus: status?.[1] || {},
        };
      },
    }),
    [primaryVideo?.current, secondaryVideo?.current]
  );
};

const delay = async (delayTime) => new Promise((r) => setTimeout(r, delayTime));
