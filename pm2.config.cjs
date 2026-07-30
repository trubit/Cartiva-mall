/**
 * PM2 ecosystem file — production cluster config.
 *
 * Usage:
 *   npm run build:server          # compile TypeScript first
 *   pm2 start pm2.config.cjs      # start cluster
 *   pm2 save && pm2 startup       # persist across reboots
 *
 * PM2 spawns one process per CPU core (instances: 'max').
 * The @socket.io/redis-adapter ensures real-time events are broadcast
 * across all workers via Redis pub/sub.
 */
module.exports = {
  apps: [
    {
      name: 'cartiva-api',
      script: './dist/server/server/src/index.js', // compiled output (tsconfig.server.json outDir: ./dist/server)
      instances: 'max', // one per CPU core
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // restart if any worker exceeds 1 GB

      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        UV_THREADPOOL_SIZE: '16',
      },

      // Graceful shutdown: PM2 sends SIGINT, waits kill_timeout, then SIGKILL.
      kill_timeout: 10_000,
      listen_timeout: 10_000,
      wait_ready: true, // wait for process.send('ready') before marking online

      // Crash loop protection
      min_uptime: '10s', // must stay up 10s to count as a stable start
      max_restarts: 10, // stop restarting after 10 failures
      exp_backoff_restart_delay: 100, // exponential back-off on restarts

      // Log to stdout/stderr only — container runtime captures these.
      error_file: '/dev/null',
      out_file: '/dev/null',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
