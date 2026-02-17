#!/usr/bin/env node
/**
 * Prepares the site for deployment: ensures production env exists, runs build, prints next steps.
 * Run from yesmagic folder: npm run prepare-deploy
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const envPath = join(root, '.env')
const envProdPath = join(root, '.env.production')
const envProdExamplePath = join(root, '.env.production.example')

function log(msg) {
  console.log(msg)
}

function run(cmd, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))))
  })
}

async function main() {
  log('')
  log('=== YESMagic: Prepare for deployment ===')
  log('')

  if (!existsSync(envProdPath)) {
    if (existsSync(envProdExamplePath)) {
      const example = readFileSync(envProdExamplePath, 'utf8')
      writeFileSync(envProdPath, example)
      log('Created .env.production from .env.production.example.')
      log('Edit yesmagic/.env.production and set your production URLs, then run this again.')
      log('')
      process.exit(0)
      return
    }
    if (existsSync(envPath)) {
      const env = readFileSync(envPath, 'utf8')
      const prod = env.replace(/localhost:\d+/g, 'YOUR_PRODUCTION_URL').replace(/pk_test_/g, 'pk_live_').replace(/sk_test_/g, 'sk_live_')
      writeFileSync(envProdPath, prod + '\n# Review and replace YOUR_PRODUCTION_URL with your real order server URL\n')
      log('Created .env.production from .env. Please edit it and set VITE_ORDER_API_URL to your real server URL.')
      log('')
      process.exit(0)
      return
    }
    log('No .env or .env.production.example found. Create .env.production with VITE_ORDER_API_URL and VITE_STRIPE_PUBLISHABLE_KEY.')
    process.exit(1)
  }

  log('Running build (using .env.production)...')
  log('')
  try {
    await run('npm', ['run', 'build'])
  } catch (e) {
    process.exit(1)
  }

  log('')
  log('Build complete. Next steps:')
  log('  1. Deploy the "dist" folder to your host (Netlify, Vercel, or your server).')
  log('  2. Or run: npm run deploy:site   (if you use Vercel and have linked this project).')
  log('  3. Deploy the server: cd server && npm run deploy   (if you use Railway).')
  log('')
  log('See DEPLOYMENT.md for full instructions.')
  log('')
}

main()
