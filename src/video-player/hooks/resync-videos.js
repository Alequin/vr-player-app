export const MAX_IN_SYNC_MILLISECOND_DIFFERENCE = 25;
export const EXTREME_OUT_OF_SYNC_MILLISECOND_DIFFERENCE = 100;

export const arePlayerInSync = (primaryStatus, secondaryStatus) =>
  Math.abs(getPlayersPositionDifference(primaryStatus, secondaryStatus)) <=
  MAX_IN_SYNC_MILLISECOND_DIFFERENCE;

export const resyncVideos = async (
  videoPlayer,
  primaryStatus,
  secondaryStatus,
  setPosition
) => {
  // use set position if the sync issues is very bad
  if (arePlayersVeryOutOfSync(primaryStatus, secondaryStatus))
    await setPosition(primaryStatus.positionMillis);

  // use video rate for small tweaks in video sync
  const isPrimaryAhead =
    getPlayersPositionDifference(primaryStatus, secondaryStatus) > 0;

  if (isPrimaryAhead && secondaryStatus.rate <= 1)
    await videoPlayer.setSecondaryRate(1.1);

  const promises = [];

  if (!isPrimaryAhead && secondaryStatus.rate > 1)
    promises.push(videoPlayer.setSecondaryRate(1));

  if (!isPrimaryAhead) promises.push(videoPlayer.delaySecondary(25));

  await Promise.all(promises);
};

const arePlayersVeryOutOfSync = (primaryStatus, secondaryStatus) =>
  Math.abs(getPlayersPositionDifference(primaryStatus, secondaryStatus)) >
  EXTREME_OUT_OF_SYNC_MILLISECOND_DIFFERENCE;

const getPlayersPositionDifference = (primaryStatus, secondaryStatus) =>
  primaryStatus.positionMillis - secondaryStatus.positionMillis;
