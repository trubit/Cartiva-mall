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
      const result = execSync(
        `netstat -ano | findstr :${port}`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      )
      const pids = [
        ...new Set(
          result
            .split('\n')
            .map((l) => l.trim().split(/\s+/).pop())
            .filter((p) => p && /^\d+$/.test(p) && p !== '0'),
        ),
      ]
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        } catch {}
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore', shell: true })
    }
  } catch {}
}

killPort(serverPort)
killPort(clientPort)
