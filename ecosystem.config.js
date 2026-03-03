module.exports = {
  apps: [
    {
      name: 'mariposa-backend',
      cwd: '/opt/mariposa/backend',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PATH: '/usr/local/bin:/usr/bin:/bin:/home/ubuntu/.bun/bin',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
    },
    {
      name: 'mariposa-frontend',
      cwd: '/opt/mariposa/frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};
