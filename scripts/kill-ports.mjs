import { execSync } from 'child_process'
import { readFileSync } from 'fs'

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
const clientPort = env.CLIENT_URL ? new URL(env.CLIENT_URL).port : '5170'

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr " LISTENING"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
      // Match exactly ":PORT " to avoid matching port 50010 when looking for 5001
      const portPattern = new RegExp(`:${port}\\s`)
      const pids = [
        ...new Set(
          result
            .split('\n')
            .filter((l) => portPattern.test(l))
            .map((l) => l.trim().split(/\s+/).pop())
            .filter((p) => p && /^\d+$/.test(p) && p !== '0'),
        ),
      ]
      for (const p of pids) {
        try {
          execSync(`taskkill /F /PID ${p}`, { stdio: 'ignore' })
          console.log(`Killed PID ${p} on port ${port}`)
        } catch {}
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore', shell: true })
    }
  } catch {}
}

killPort(serverPort)
killPort(clientPort)

// Give the OS a moment to fully release the port before the server binds
await new Promise((r) => setTimeout(r, 1000))
