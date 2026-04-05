import type { EquirectangularTilesPanorama } from "@photo-sphere-viewer/equirectangular-tiles-adapter";
import { clamp, wrapAngleRad } from "@/lib/exterior-tour/math";
import type {
  ExteriorVector,
  PanoMeta,
  PanoTileDescriptor,
  PanoViewState,
} from "@/lib/exterior-tour/types";

export type ExteriorPanoramaSource = string | EquirectangularTilesPanorama;

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinPanoPath(baseUrl: string, path: string) {
  return `${ensureTrailingSlash(baseUrl)}${path.replace(/^\/+/, "")}`;
}

function loadImage(src: string, fetchPriority: "high" | "low" | "auto" = "auto") {
  return new Promise<string>((resolve, reject) => {
    const image = new Image() as HTMLImageElement & {
      fetchPriority?: "high" | "low" | "auto";
    };
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.loading = "eager";
    image.fetchPriority = fetchPriority;
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
}

function wrapColumnDistance(distance: number, cols: number) {
  const absoluteDistance = Math.abs(distance);
  return Math.min(absoluteDistance, cols - absoluteDistance);
}

function angleFromVector(vector: ExteriorVector) {
  return Math.atan2(vector.y, vector.x);
}

function resolveFocusColumn(
  meta: PanoMeta,
  focusDirection?: ExteriorVector,
  panoForward?: ExteriorVector,
  fallbackYaw = 0,
) {
  const cols = meta.actualCols ?? meta.cols;
  if (!focusDirection || !panoForward) {
    const raw = ((fallbackYaw / (Math.PI * 2)) + 0.5) * cols;
    return ((raw % cols) + cols) % cols;
  }

  const delta = wrapAngleRad(angleFromVector(focusDirection) - angleFromVector(panoForward));
  const normalized = 0.5 + delta / (Math.PI * 2);
  const rawColumn = normalized * cols;
  return ((rawColumn % cols) + cols) % cols;
}

export function getPanoMetaUrl(panoId: string, baseUrl: string) {
  return joinPanoPath(baseUrl, `${panoId}/meta.json`);
}

export function getPanoPreviewUrl(
  panoId: string,
  previewFile = "preview.jpg",
  baseUrl: string,
) {
  return joinPanoPath(baseUrl, `${panoId}/${previewFile}`);
}

export function getPanoTileUrl(panoId: string, tilePath: string, baseUrl: string) {
  return joinPanoPath(baseUrl, `${panoId}/${tilePath}`);
}

export function canUseTiledPanorama(meta: PanoMeta) {
  const cols = meta.actualCols ?? meta.cols;
  const rows = meta.actualRows ?? meta.rows;
  return isPowerOfTwo(cols) && isPowerOfTwo(rows);
}

export function getResolvedPreviewUrl(
  panoId: string,
  baseUrl: string,
  previewFile = "preview.jpg",
) {
  return getPanoPreviewUrl(panoId, previewFile, baseUrl);
}

export function buildPhotoSpherePanorama(
  panoId: string,
  meta: PanoMeta,
  baseUrl: string,
  preferTiles = true,
  previewUrl?: string | null,
): ExteriorPanoramaSource {
  const resolvedPreviewUrl =
    previewUrl ?? getResolvedPreviewUrl(panoId, baseUrl, meta.preview ?? "preview.jpg");

  if (!preferTiles || !canUseTiledPanorama(meta)) {
    if (!resolvedPreviewUrl) {
      throw new Error(`Missing preview image for ${panoId}`);
    }

    return resolvedPreviewUrl;
  }

  const cols = meta.actualCols ?? meta.cols;
  const rows = meta.actualRows ?? meta.rows;

  return {
    width: meta.width,
    cols,
    rows,
    ...(resolvedPreviewUrl ? { baseUrl: resolvedPreviewUrl } : {}),
    tileUrl: (col: number, row: number) => {
      if (col < 0 || row < 0 || col >= cols || row >= rows) {
        return null;
      }

      const explicitTile = meta.tiles?.find(
        (tile) => tile.col === col && tile.row === row,
      );

      if (explicitTile) {
        return getPanoTileUrl(panoId, `tiles/${explicitTile.file}`, baseUrl);
      }

      const template =
        meta.tileUrl ?? `tiles/tile_{col}_{row}.${meta.tileFormat ?? "jpg"}`;

      return getPanoTileUrl(
        panoId,
        template.replace("{col}", String(col)).replace("{row}", String(row)),
        baseUrl,
      );
    },
  };
}

export function buildTileDescriptors(panoId: string, meta: PanoMeta, baseUrl: string) {
  const cols = meta.actualCols ?? meta.cols;
  const rows = meta.actualRows ?? meta.rows;
  const tileTemplate =
    meta.tileUrl ?? `tiles/tile_{col}_{row}.${meta.tileFormat ?? "jpg"}`;

  const tiles: PanoTileDescriptor[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      tiles.push({
        key: `${col}:${row}`,
        col,
        row,
        url: getPanoTileUrl(
          panoId,
          tileTemplate.replace("{col}", String(col)).replace("{row}", String(row)),
          baseUrl,
        ),
        left: col / cols,
        top: row / rows,
        width: 1 / cols,
        height: 1 / rows,
      });
    }
  }

  return tiles;
}

export function selectPriorityTiles(
  panoId: string,
  meta: PanoMeta,
  baseUrl: string,
  view: PanoViewState,
  limit = 48,
) {
  const cols = meta.actualCols ?? meta.cols;
  const rows = meta.actualRows ?? meta.rows;
  const descriptors = buildTileDescriptors(panoId, meta, baseUrl);
  const focusColumn = resolveFocusColumn(meta, undefined, undefined, view.yaw);
  const focusRow = clamp((0.5 - view.pitch / Math.PI) * rows, 0, rows - 1);

  return descriptors
    .sort((a, b) => {
      const aColDistance = wrapColumnDistance(a.col - focusColumn, cols);
      const bColDistance = wrapColumnDistance(b.col - focusColumn, cols);
      const aRowDistance = Math.abs(a.row - focusRow);
      const bRowDistance = Math.abs(b.row - focusRow);

      const aScore = aRowDistance * 2.8 + aColDistance * 0.9;
      const bScore = bRowDistance * 2.8 + bColDistance * 0.9;

      return aScore - bScore;
    })
    .slice(0, limit);
}

export function selectWarmupTiles(
  panoId: string,
  meta: PanoMeta,
  baseUrl: string,
  limit = 12,
) {
  return selectPriorityTiles(
    panoId,
    meta,
    baseUrl,
    {
      yaw: 0,
      pitch: 0,
      zoom: 1.15,
    },
    limit,
  );
}

export class PanoAssetStore {
  private metaCache = new Map<string, PanoMeta>();
  private metaPromises = new Map<string, Promise<PanoMeta>>();
  private imagePromises = new Map<string, Promise<string>>();

  constructor(private readonly baseUrl: string) {}

  async getMeta(panoId: string) {
    const cachedMeta = this.metaCache.get(panoId);
    if (cachedMeta) {
      return cachedMeta;
    }

    const cachedPromise = this.metaPromises.get(panoId);
    if (cachedPromise) {
      return cachedPromise;
    }

    const promise = fetch(getPanoMetaUrl(panoId, this.baseUrl), {
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load pano meta for ${panoId}`);
        }

        const meta = (await response.json()) as PanoMeta;
        this.metaCache.set(panoId, meta);
        return meta;
      })
      .finally(() => {
        this.metaPromises.delete(panoId);
      });

    this.metaPromises.set(panoId, promise);
    return promise;
  }

  preloadImage(src: string, fetchPriority: "high" | "low" | "auto" = "auto") {
    const cached = this.imagePromises.get(src);
    if (cached) {
      return cached;
    }

    const promise = loadImage(src, fetchPriority).catch((error) => {
      this.imagePromises.delete(src);
      throw error;
    });

    this.imagePromises.set(src, promise);
    return promise;
  }

  async preloadPreview(
    panoId: string,
    previewFile = "preview.jpg",
    fetchPriority: "high" | "low" | "auto" = "high",
  ) {
    const src = getPanoPreviewUrl(panoId, previewFile, this.baseUrl);
    await this.preloadImage(src, fetchPriority);
    return src;
  }

  async preloadTile(tile: PanoTileDescriptor, fetchPriority: "high" | "low" | "auto" = "auto") {
    await this.preloadImage(tile.url, fetchPriority);
    return tile;
  }
}