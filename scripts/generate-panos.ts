import fs from "fs"
import path from "path"
import sharp from "sharp"

const INPUT = "./raw-panos"
const OUTPUT = "./public/panos"

const PREVIEW_WIDTH = 2000
const TILE_CONCURRENCY = 8

// Photo Sphere Viewer tiled adapter needs power-of-2 grid.
// For 24576 x 12288, 64 x 32 is perfect:
// 24576 / 64 = 384
// 12288 / 32 = 384
const TARGET_COLS = 64
const TARGET_ROWS = 32

const SHARP_INPUT_OPTIONS = {
  limitInputPixels: false,
  sequentialRead: true,
} as const

function getPanoId(file: string): string {
  return path.parse(file).name.replace(/^NewLS_/i, "LS_")
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

async function runInBatches<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    await Promise.all(batch.map((item, index) => worker(item, i + index)))
  }
}

async function processImage(file: string): Promise<void> {
  console.log("processing:", file)

  const panoId = getPanoId(file)
  const inputPath = path.join(INPUT, file)
  const folder = path.join(OUTPUT, panoId)
  const tilesFolder = path.join(folder, "tiles")

  ensureDir(folder)
  ensureDir(tilesFolder)

  const baseImage = sharp(inputPath, SHARP_INPUT_OPTIONS)
  const meta = await baseImage.metadata()

  if (!meta.width || !meta.height) {
    throw new Error(`Could not read dimensions for ${file}`)
  }

  const fullWidth = meta.width
  const fullHeight = meta.height

  const cols = TARGET_COLS
  const rows = TARGET_ROWS

  if (fullWidth % cols !== 0 || fullHeight % rows !== 0) {
    throw new Error(
      [
        `Panorama "${file}" is not evenly divisible by the target PSV grid.`,
        `Image size: ${fullWidth} x ${fullHeight}`,
        `Target grid: ${cols} x ${rows}`,
        `Remainders: width % cols = ${fullWidth % cols}, height % rows = ${fullHeight % rows}`,
        `Use a different TARGET_COLS / TARGET_ROWS or resize/pad the source panorama first.`,
      ].join("\n")
    )
  }

  const tileWidth = fullWidth / cols
  const tileHeight = fullHeight / rows

  if (tileWidth !== tileHeight) {
    console.warn(
      `Warning: tiles are not square for ${file}. tileWidth=${tileWidth}, tileHeight=${tileHeight}`
    )
  }

  await baseImage
    .clone()
    .resize({
      width: PREVIEW_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 70,
      mozjpeg: true,
    })
    .toFile(path.join(folder, "preview.jpg"))

  const tileJobs: Array<{
    row: number
    col: number
    left: number
    top: number
    width: number
    height: number
  }> = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tileJobs.push({
        row,
        col,
        left: col * tileWidth,
        top: row * tileHeight,
        width: tileWidth,
        height: tileHeight,
      })
    }
  }

  await runInBatches(tileJobs, TILE_CONCURRENCY, async (job) => {
    await baseImage
      .clone()
      .extract({
        left: job.left,
        top: job.top,
        width: job.width,
        height: job.height,
      })
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toFile(path.join(tilesFolder, `tile_${job.col}_${job.row}.jpg`))
  })

  const metaJson = {
    width: fullWidth,
    height: fullHeight,
    cols,
    rows,
    tileSize: tileWidth, // 384 for 24576x12288 with 64x32 grid
    preview: "preview.jpg",
    tileFormat: "jpg",
    tileUrl: "tiles/tile_{col}_{row}.jpg",
  }

  fs.writeFileSync(
    path.join(folder, "meta.json"),
    JSON.stringify(metaJson, null, 2),
    "utf8"
  )

  console.log("done:", file, {
    ...metaJson,
    tileWidth,
    tileHeight,
    totalTiles: cols * rows,
  })
}

async function run(): Promise<void> {
  ensureDir(INPUT)
  ensureDir(OUTPUT)

  const files = fs
    .readdirSync(INPUT)
    .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (files.length === 0) {
    console.log("No pano files found in:", INPUT)
    return
  }

  const totalStart = Date.now()

  for (const file of files) {
    const start = Date.now()
    await processImage(file)
    const seconds = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`${file} took ${seconds}s`)
  }

  const totalMinutes = ((Date.now() - totalStart) / 1000 / 60).toFixed(2)
  console.log(`All panos processed successfully in ${totalMinutes} min`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

