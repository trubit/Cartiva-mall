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
      strictPort: true, // fail immediately if port is busy — never silently fall back
      host: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: clientPort,
      },
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
            proxy.on('error', (_err) => {
              // Suppress noisy socket proxy errors in dev
            })
            proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
              socket.on('error', (_err) => {
                // Suppress socket ECONNRESET / hangup errors on WS stream
              })
            })
          },
        },
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@mui') || id.includes('@emotion')) {
                return 'vendor-mui'
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts'
              }
              if (id.includes('@xyflow') || id.includes('reactflow')) {
                return 'vendor-flow'
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion'
              }
              if (id.includes('react-icons')) {
                return 'vendor-icons'
              }
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom')
              ) {
                return 'vendor-react'
              }
              if (id.includes('@tanstack') || id.includes('axios') || id.includes('zustand')) {
                return 'vendor-state'
              }
            }
          },
        },
      },
    },
  }
})
