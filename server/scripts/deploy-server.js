#!/usr/bin/env node
/**
 * Deploys the order server to Railway (if Railway CLI is available).
 * Run from yesmagic/server folder: npm run deploy
 * First-time: npm i -g @railway/cli && railway login && railway link
 */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function run(cmd, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))))
  })
}

async function main() {
  console.log('\nDeploying server to Railway...\n')
  try {
    await run('npx', ['railway', 'up'])
    console.log('\nDeploy complete. Set env vars (STRIPE_SECRET_KEY, ORDER_EMAIL, ALLOWED_ORIGINS) in the Railway dashboard.\n')
  } catch (e) {
    console.log('\nRailway deploy failed. Options:')
    console.log('  1. Install Railway CLI: npm i -g @railway/cli')
    console.log('  2. Run: railway login && railway link (or railway init)')
    console.log('  3. Then run: npm run deploy')
    console.log('  Or deploy the "server" folder manually to Render/Fly.io (see DEPLOYMENT.md).\n')
    process.exit(1)
  }
}

main()
