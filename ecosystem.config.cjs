module.exports = {
  apps: [
    {
      name: "willa-ewa",
      script: "dist/server/src/index.js",
      cwd: "/var/www/willa-ewa/server",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "/var/www/willa-ewa/server/logs/pm2-error.log",
      out_file: "/var/www/willa-ewa/server/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
