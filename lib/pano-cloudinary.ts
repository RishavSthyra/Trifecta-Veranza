export const CLOUDINARY_PANO_IMAGE_BASE_URL =
  "https://res.cloudinary.com/dp7bxmquq/image/upload/panos/";
export const CLOUDINARY_PANO_RAW_BASE_URL =
  "https://res.cloudinary.com/dp7bxmquq/raw/upload/panos/";

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinPanoPath(baseUrl: string, path: string) {
  return `${ensureTrailingSlash(baseUrl)}${path.replace(/^\/+/, "")}`;
}

export function getPanoPreviewUrl(
  panoId: string,
  previewFile = "preview.jpg",
  imageBaseUrl = CLOUDINARY_PANO_IMAGE_BASE_URL,
) {
  return joinPanoPath(imageBaseUrl, `${panoId}/${previewFile}`);
}

export function getPanoMetaUrl(
  panoId: string,
  rawBaseUrl = CLOUDINARY_PANO_RAW_BASE_URL,
) {
  return joinPanoPath(rawBaseUrl, `${panoId}/meta.json`);
}

export function getPanoTileUrl(
  panoId: string,
  tilePath: string,
  imageBaseUrl = CLOUDINARY_PANO_IMAGE_BASE_URL,
) {
  return joinPanoPath(imageBaseUrl, `${panoId}/${tilePath}`);
}
