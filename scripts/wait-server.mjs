import { readFileSync } from 'fs'
import http from 'http'

const env = {}
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0 && !line.startsWith('#')) {
      env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
  }
} catch {}

const serverPort = env.PORT ?? '5001'
const url = `http://127.0.0.1:${serverPort}/health`
const TIMEOUT_MS = 120_000
const INTERVAL_MS = 1_000

function check() {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        res.resume()
        resolve(res.statusCode < 500)
      })
      .on('error', () => resolve(false))
  })
}

console.log(`Waiting for server on port ${serverPort}...`)
const deadline = Date.now() + TIMEOUT_MS

;(async () => {
  while (Date.now() < deadline) {
    if (await check()) {
      console.log('Server is ready.')
      process.exit(0)
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
  console.error(`Server did not start within ${TIMEOUT_MS / 1000}s`)
  process.exit(1)
})()
