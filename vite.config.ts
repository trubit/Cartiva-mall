import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { ServerResponse } from 'http'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverPort = parseInt(env.PORT ?? '5000', 10)
  const clientPort = env.CLIENT_URL ? parseInt(new URL(env.CLIENT_URL).port, 10) : 5170

  const backendTarget = `http://localhost:${serverPort}`

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@client': path.resolve(__dirname, './src/client'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@components': path.resolve(__dirname, './src/client/components'),
        '@pages': path.resolve(__dirname, './src/client/pages'),
        '@hooks': path.resolve(__dirname, './src/client/hooks'),
        '@store': path.resolve(__dirname, './src/client/store'),
        '@services': path.resolve(__dirname, './src/client/services'),
        '@layouts': path.resolve(__dirname, './src/client/layouts'),
        '@features': path.resolve(__dirname, './src/client/features'),
        '@assets': path.resolve(__dirname, './src/client/assets'),
      },
    },
    server: {
      port: clientPort,
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              const r = res as ServerResponse
              if (!r.headersSent) {
                r.writeHead(503, { 'Content-Type': 'application/json' })
                r.end(
                  JSON.stringify({
                    success: false,
                    message: 'Server is starting up, please retry',
                  }),
                )
              }
            })
          },
        },
        // Proxy ALL Socket.IO traffic (including namespace handshakes) to the backend.
        // ws: true enables WebSocket upgrade proxying.
        // Socket.IO always uses /socket.io as the HTTP path regardless of namespace.
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              // Suppress noisy "socket hang up" errors during WS upgrade in dev
              if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') {
                console.warn('[socket.io proxy error]', err.message)
              }
            })
          },
        },
      },
    },
  }
})
