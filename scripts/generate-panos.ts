import fs from "fs"
import path from "path"
import sharp from "sharp"

const INPUT = "./raw-panos"
const OUTPUT = "./public/panos"

const TILE_SIZE = 512
const PREVIEW_WIDTH = 2000
const TILE_CONCURRENCY = 8

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
  const cols = Math.ceil(fullWidth / TILE_SIZE)
  const rows = Math.ceil(fullHeight / TILE_SIZE)

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
      const left = col * TILE_SIZE
      const top = row * TILE_SIZE
      const tileWidth = Math.min(TILE_SIZE, fullWidth - left)
      const tileHeight = Math.min(TILE_SIZE, fullHeight - top)

      tileJobs.push({
        row,
        col,
        left,
        top,
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
    tileSize: TILE_SIZE,
    preview: "preview.jpg",
    tileFormat: "jpg",
    tileUrl: "tiles/tile_{col}_{row}.jpg",
  }

  fs.writeFileSync(
    path.join(folder, "meta.json"),
    JSON.stringify(metaJson, null, 2),
    "utf8"
  )

  console.log("done:", file, metaJson)
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