module.exports = {
  apps : [{
    name: 'API',
    script: 'dist/bin/www',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    node_args: '-r dotenv/config',
    instances: 1,
    exec_mode: 'fork_mode',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
