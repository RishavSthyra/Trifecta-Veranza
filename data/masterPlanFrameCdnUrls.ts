const MASTER_PLAN_FRAME_CDN_BASE_URL =
  "https://res.cloudinary.com/dlhfbu3kh/image/upload";

export function getMasterPlanFrameCdnUrl(frame: number) {
  return `${MASTER_PLAN_FRAME_CDN_BASE_URL}/frame_${String(frame).padStart(5, "0")}.jpg`;
}
