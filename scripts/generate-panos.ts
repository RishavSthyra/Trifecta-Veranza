import fs from "fs"
import path from "path"
import os from "os"
import sharp from "sharp"

const INPUT = "./raw-panos"
const RESIZED = "./resized-panos"
const OUTPUT = "./public/bareshell-pano-trifecta-new"

const PREVIEW_WIDTH = 2000

// 🔥 perfect pano size (2:1 ratio)
const TARGET_WIDTH = 16384
const TARGET_HEIGHT = 8192

const CPU_THREADS =
  typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length

sharp.concurrency(CPU_THREADS)
sharp.simd(true)

const FILE_CONCURRENCY = Math.max(1, Math.min(4, Math.floor(CPU_THREADS / 4)))
const TILE_CONCURRENCY = Math.max(16, CPU_THREADS * 2)

// 🔥 grid (now guaranteed square tiles)
const TARGET_COLS = 16
const TARGET_ROWS = 8

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

function pathExists(targetPath: string): boolean {
  return fs.existsSync(targetPath)
}

function isAlreadyProcessed(folder: string): boolean {
  const previewPath = path.join(folder, "preview.jpg")
  const metaPath = path.join(folder, "meta.json")
  const tilesFolder = path.join(folder, "tiles")

  if (!pathExists(folder)) return false
  if (!pathExists(previewPath)) return false
  if (!pathExists(metaPath)) return false
  if (!pathExists(tilesFolder)) return false

  const tileFiles = fs
    .readdirSync(tilesFolder)
    .filter((file) => /\.jpg$/i.test(file))

  return tileFiles.length > 0
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

//
// 🔥 STEP 1: RESIZE PANOS (ULTRA HIGH QUALITY)
//
async function resizePano(file: string): Promise<string> {
  const inputPath = path.join(INPUT, file)
  const outputPath = path.join(RESIZED, file)

  if (pathExists(outputPath)) {
    console.log("already resized:", file)
    return outputPath
  }

  console.log("resizing:", file)

  await sharp(inputPath, SHARP_INPUT_OPTIONS)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "inside", // keeps 2:1 by cropping if needed
      kernel: sharp.kernel.lanczos3, // 🔥 best quality resize
    })
    .jpeg({
      quality: 90, // 🔥 max quality

      mozjpeg: false,
    })
    .toFile(outputPath)

  return outputPath
}

//
// 🔥 STEP 2: TILE FROM RESIZED PANO
//
async function processImage(file: string): Promise<void> {
  console.log("processing:", file)

  const panoId = getPanoId(file)

  // 🔥 USE RESIZED VERSION
  const resizedPath = await resizePano(file)

  const folder = path.join(OUTPUT, panoId)
  const tilesFolder = path.join(folder, "tiles")

  if (isAlreadyProcessed(folder)) {
    console.log(`skipping: ${file} already processed`)
    return
  }

  ensureDir(folder)
  ensureDir(tilesFolder)

  const baseImage = sharp(resizedPath, SHARP_INPUT_OPTIONS)
  const meta = await baseImage.metadata()

  if (!meta.width || !meta.height) {
    throw new Error(`Could not read dimensions for ${file}`)
  }

  const fullWidth = meta.width
  const fullHeight = meta.height

  const cols = TARGET_COLS
  const rows = TARGET_ROWS

  const tileWidth = fullWidth / cols
  const tileHeight = fullHeight / rows

  // now ALWAYS square
  if (tileWidth !== tileHeight) {
    throw new Error("Tiles are not square — something is wrong")
  }

  //
  // preview
  //
  await baseImage
    .clone()
    .resize({
      width: PREVIEW_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 90,
    })
    .toFile(path.join(folder, "preview.jpg"))

  //
  // tiles
  //
  const tileJobs: any[] = []

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
    const tilePath = path.join(
      tilesFolder,
      `tile_${job.col}_${job.row}.jpg`
    )

    if (pathExists(tilePath)) return

    await baseImage
      .clone()
      .extract({
        left: job.left,
        top: job.top,
        width: job.width,
        height: job.height,
      })
      .jpeg({
        quality: 95, // 🔥 very high, almost lossless
        chromaSubsampling: "4:4:4",
      })
      .toFile(tilePath)
  })

  //
  // meta
  //
  const metaJson = {
    width: fullWidth,
    height: fullHeight,
    cols,
    rows,
    tileWidth,
    tileHeight,
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
    totalTiles: cols * rows,
  })
}

//
// 🔥 MAIN
//
async function run(): Promise<void> {
  ensureDir(INPUT)
  ensureDir(RESIZED)
  ensureDir(OUTPUT)

  const files = fs
    .readdirSync(INPUT)
    .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (files.length === 0) {
    console.log("No pano files found in:", INPUT)
    return
  }

  console.log("CPU:", CPU_THREADS)
  console.log("grid:", `${TARGET_COLS} x ${TARGET_ROWS}`)
  console.log("target size:", `${TARGET_WIDTH} x ${TARGET_HEIGHT}`)

  const totalStart = Date.now()

  await runInBatches(files, FILE_CONCURRENCY, async (file) => {
    const start = Date.now()
    await processImage(file)
    console.log(`${file} done in ${((Date.now() - start) / 1000).toFixed(1)}s`)
  })

  console.log(
    `All done in ${((Date.now() - totalStart) / 1000 / 60).toFixed(2)} min`
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})