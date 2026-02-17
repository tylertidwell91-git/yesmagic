#!/usr/bin/env node
/**
 * Updates local default inventory from an exported JSON file.
 *
 * 1. On the live site (yesmagicshop.com/admin), click "Export inventory" to download yesmagic-inventory.json
 * 2. Put the file in the yesmagic folder (or pass its path as the first argument)
 * 3. Run: npm run pull-inventory
 *
 * This overwrites the defaultProducts array in src/data/inventory.js so the next build uses the live data.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const inventoryPath = join(root, 'src/data/inventory.js')

const exportPath = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(root, 'yesmagic-inventory.json')

function formatProduct(p) {
  const fields = [
    `id: ${JSON.stringify(p.id)}`,
    `price: ${Number(p.price) ?? 0}`,
    `quantity: ${Math.floor(Number(p.quantity) ?? 0)}`,
    `image: ${JSON.stringify(p.image ?? '')}`,
    `series: ${JSON.stringify((p.series ?? '').trim())}`,
    `item: ${JSON.stringify((p.item ?? '').trim())}`,
    `description: ${JSON.stringify((p.description ?? '').trim())}`,
  ]
  return `  { ${fields.join(', ')} }`
}

try {
  const raw = readFileSync(exportPath, 'utf8')
  const products = JSON.parse(raw)
  if (!Array.isArray(products) || products.length === 0) {
    console.error('JSON file must contain a non-empty array of products.')
    process.exit(1)
  }

  const inventoryJs = readFileSync(inventoryPath, 'utf8')
  const arrayLines = products.map(formatProduct).join(',\n')
  const newBlock = `export const defaultProducts = [\n${arrayLines}\n]`

  const newContent = inventoryJs.replace(
    /(export\s+)?const defaultProducts = \[[\s\S]*?^\]/m,
    newBlock
  )

  if (newContent === inventoryJs) {
    console.error('Could not find defaultProducts array in src/data/inventory.js')
    process.exit(1)
  }

  writeFileSync(inventoryPath, newContent)
  console.log(`Updated src/data/inventory.js with ${products.length} product(s) from ${exportPath}`)
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(`File not found: ${exportPath}`)
    console.error('Export inventory from yesmagicshop.com/admin (Export inventory button), save as yesmagic-inventory.json in the yesmagic folder, then run: npm run pull-inventory')
  } else {
    console.error(e.message)
  }
  process.exit(1)
}
