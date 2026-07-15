'use strict';

// PM2 process configuration for Elite Hub.
// Two processes: the API server and the BullMQ worker process.
// They are intentionally kept separate so a worker crash never takes the
// API down, and vice versa — PM2 restarts each independently.

const path = require('path');

const ROOT = path.resolve(__dirname); // ~/elite-hub/backend

module.exports = {
  apps: [
    {
      name:         'elite-hub-api',
      script:       path.join(ROOT, 'src/index.js'),
      cwd:          ROOT,

      // cluster mode spreads incoming HTTP load across all CPU cores.
      // Set to a number or 'max' — on a lean VPS, 2 is a safe starting point.
      instances:    process.env.API_INSTANCES || 2,
      exec_mode:    'cluster',

      // Environment loaded from the backend .env file.
      // Do NOT put secrets here — they stay in .env.
      env: {
        NODE_ENV: 'production',
        PORT:     5000,
      },

      // Restart strategy
      autorestart:      true,
      max_restarts:     10,
      min_uptime:       '10s',   // must stay up 10s before restart counter resets
      restart_delay:    4000,    // wait 4s between restarts

      // Logs
      out_file:   path.join(ROOT, 'logs/api-out.log'),
      error_file: path.join(ROOT, 'logs/api-err.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Rotate logs at 10MB so the disk doesn't fill up silently
      max_size:   '10M',

      watch:      false, // never watch in production
    },

    {
      name:       'elite-hub-worker',
      script:     path.join(ROOT, 'src/workers/index.js'),
      cwd:        ROOT,

      // Workers must be fork mode — BullMQ connections are not safe to share
      // across cluster forks. One worker process is enough; BullMQ handles
      // concurrency internally via the `concurrency` option per queue.
      instances:  1,
      exec_mode:  'fork',

      env: {
        NODE_ENV: 'production',
      },

      autorestart:   true,
      max_restarts:  10,
      min_uptime:    '10s',
      restart_delay: 4000,

      out_file:        path.join(ROOT, 'logs/worker-out.log'),
      error_file:      path.join(ROOT, 'logs/worker-err.log'),
      merge_logs:      true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size:        '10M',

      watch: false,
    },
  ],
};
