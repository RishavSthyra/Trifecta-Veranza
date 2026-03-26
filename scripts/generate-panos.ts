import fs from "fs"
import path from "path"
import sharp from "sharp"

const INPUT = "./raw-panos"
const OUTPUT = "./public/panos"
const TILE_SIZE = 512
const PREVIEW_WIDTH = 2000

async function processImage(file: string): Promise<void> {
  console.log("processing:", file)

  const name = path.parse(file).name
  const inputPath = path.join(INPUT, file)
  const folder = path.join(OUTPUT, name)
  const tilesFolder = path.join(folder, "tiles")

  fs.mkdirSync(tilesFolder, { recursive: true })

  const image = sharp(inputPath)
  const meta = await image.metadata()

  if (!meta.width || !meta.height) {
    throw new Error(`Could not read dimensions for ${file}`)
  }

  const fullWidth = meta.width
  const fullHeight = meta.height
  const cols = Math.ceil(fullWidth / TILE_SIZE)
  const rows = Math.ceil(fullHeight / TILE_SIZE)

  await sharp(inputPath)
    .resize({ width: PREVIEW_WIDTH })
    .jpeg({ quality: 70 })
    .toFile(path.join(folder, "preview.jpg"))

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * TILE_SIZE
      const top = row * TILE_SIZE
      const tileWidth = Math.min(TILE_SIZE, fullWidth - left)
      const tileHeight = Math.min(TILE_SIZE, fullHeight - top)

      await sharp(inputPath)
        .extract({
          left,
          top,
          width: tileWidth,
          height: tileHeight,
        })
        .jpeg({ quality: 80 })
        .toFile(path.join(tilesFolder, `tile_${col}_${row}.jpg`))
    }
  }

  const metaJson = {
    width: fullWidth,
    height: fullHeight,
    cols,
    rows,
    tileSize: TILE_SIZE,
    preview: "preview.jpg",
  }

  fs.writeFileSync(
    path.join(folder, "meta.json"),
    JSON.stringify(metaJson, null, 2),
    "utf8"
  )

  console.log("done:", file, metaJson)
}

async function run(): Promise<void> {
  const files = fs
    .readdirSync(INPUT)
    .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))

  for (const file of files) {
    await processImage(file)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})