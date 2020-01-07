const redis = require('redis')
const session = require('express-session')
let RedisStore = require('connect-redis')(session)

// Redis
let redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 1,
});
redisClient.unref();
redisClient.on('error', console.error);

module.exports = session(
  {
    secret: process.env.API_SESSION_SECRET,
    store: new RedisStore({ client: redisClient }),
    resave: false,
    saveUninitialized: true,
  }
);
