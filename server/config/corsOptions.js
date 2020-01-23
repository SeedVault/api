const whitelist = [
  process.env.VUE_APP_ACCOUNTS_URL,
  process.env.VUE_APP_API_URL,
  process.env.VUE_APP_GREENHOUSE_URL,
  process.env.VUE_APP_WALLET_URL,
  process.env.VUE_APP_STATS_URL,
];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.includes(origin) || (process.env.NODE_ENV === 'development' && typeof origin === 'undefined')) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`))
    }
  },
  credentials: true,
}

module.exports = corsOptions;
