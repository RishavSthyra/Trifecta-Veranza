export const TOTAL_MASTER_PLAN_FRAMES = 360;

const MASTER_PLAN_FRAME_CDN_BASE_URL =
  "https://res.cloudinary.com/dlhfbu3kh/image/upload";

export function wrapMasterPlanFrame(frame: number) {
  return (
    ((frame - 1 + TOTAL_MASTER_PLAN_FRAMES) % TOTAL_MASTER_PLAN_FRAMES) + 1
  );
}

export function getMasterPlanFrameCdnUrl(frame: number) {
  return `${MASTER_PLAN_FRAME_CDN_BASE_URL}/frame_${String(wrapMasterPlanFrame(frame)).padStart(5, "0")}.jpg`;
}

export function getMasterPlanFramePreloadSequence(
  startFrame: number,
  count: number,
) {
  const frames: number[] = [];
  const seenFrames = new Set<number>();
  const maxFrames = Math.min(count, TOTAL_MASTER_PLAN_FRAMES);
  let offset = 0;

  while (
    frames.length < maxFrames &&
    seenFrames.size < TOTAL_MASTER_PLAN_FRAMES
  ) {
    const forwardFrame = wrapMasterPlanFrame(startFrame + offset);

    if (!seenFrames.has(forwardFrame)) {
      seenFrames.add(forwardFrame);
      frames.push(forwardFrame);
    }

    if (frames.length >= maxFrames) {
      break;
    }

    if (offset > 0) {
      const backwardFrame = wrapMasterPlanFrame(startFrame - offset);

      if (!seenFrames.has(backwardFrame)) {
        seenFrames.add(backwardFrame);
        frames.push(backwardFrame);
      }
    }

    offset += 1;
  }

  return frames;
}
