#!/usr/bin/env node
/**
 * Builds the site and deploys to Vercel (if Vercel CLI is available).
 * Run from yesmagic folder: npm run deploy:site
 * First-time: npx vercel login && npx vercel link
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
  console.log('\nBuilding...\n')
  await run('npm', ['run', 'build']).catch(() => process.exit(1))
  console.log('\nDeploying to Vercel...\n')
  try {
    await run('npx', ['vercel', '--prod'])
    console.log('\nDeploy complete. Update your domain in the Vercel dashboard if needed.\n')
  } catch (e) {
    console.log('\nVercel deploy failed. Install and link: npx vercel login && npx vercel link')
    console.log('Or upload the "dist" folder manually to Netlify/your host.\n')
    process.exit(1)
  }
}

main()
