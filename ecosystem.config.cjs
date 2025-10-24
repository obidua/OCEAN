module.exports = {
  apps: [
    {
      name: 'ocean-defi',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      cwd: '/var/www/ocean-defi/current',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/ocean-defi/logs/error.log',
      out_file: '/var/www/ocean-defi/logs/out.log',
      log_file: '/var/www/ocean-defi/logs/combined.log',
      time: true,
    },
  ],
};
