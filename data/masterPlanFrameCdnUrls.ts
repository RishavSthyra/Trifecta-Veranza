export const TOTAL_MASTER_PLAN_FRAMES = 360;
export const MASTER_PLAN_SCRUB_HQ_VIDEO_PATH = encodeURI(
  "https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774710495/360_Level_Sequence_2_Scrub_Hq_2_keyframes_sub100mb.mp4",
);
export const MASTER_PLAN_SCRUB_HQ_HLS_PATH = "/master-plan-scrub/hq/index.m3u8";
export const MASTER_PLAN_SCRUB_INTERACTION_VIDEO_PATH = encodeURI(
  "/360_Level_Sequence_2_Scrub_proxy_keyframes.mp4",
);
export const MASTER_PLAN_SCRUB_INTERACTION_HLS_PATH =
  "/master-plan-scrub/interaction/index.m3u8";
  
export const MASTER_PLAN_SCRUB_VIDEO_PATH = MASTER_PLAN_SCRUB_HQ_VIDEO_PATH;
export const MASTER_PLAN_SCRUB_VIDEO_FPS = 60;

const MASTER_PLAN_FRAME_CDN_BASE_URL =
  "https://res.cloudinary.com/dlhfbu3kh/image/upload";

  //https://res.cloudinary.com/dlhfbu3kh/image/upload/frame_00203.webp

const MASTER_PLAN_FRAME_CDN_TRANSFORM =
  "f_auto,q_auto:best,c_limit,w_1920";

// const MASTER_PLAN_FRAME_CDN_TRANSFORM =
//   "f_auto/q_auto:eco/c_limit,w_960";

export function wrapMasterPlanFrame(frame: number) {
  return (
    ((frame - 1 + TOTAL_MASTER_PLAN_FRAMES) % TOTAL_MASTER_PLAN_FRAMES) + 1
  );
}

export function getMasterPlanFrameCdnUrl(frame: number) {
  return `${MASTER_PLAN_FRAME_CDN_BASE_URL}/${MASTER_PLAN_FRAME_CDN_TRANSFORM}/frame_${String(wrapMasterPlanFrame(frame)).padStart(5, "0")}.jpg`;
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
