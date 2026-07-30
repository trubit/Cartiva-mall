import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/client.setup.ts'],
    include: ['src/client/**/*.{test,spec}.{ts,tsx}', 'src/shared/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './tests/coverage/client',
      include: ['src/client/**', 'src/shared/**'],
    },
  },
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
})
