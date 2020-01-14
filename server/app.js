var createError = require('http-errors');
var express = require('express');
var db = require('../lib/infrastructure/database');
var path = require('path');
let bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const csurf = require('csurf');
const corsOptions = require('./config/corsOptions');
var logger = require('morgan');
const session = require('./config/session');

db();

var app = express();
// app.set('trust proxy', '127.0.0.1');

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// API Integration Authentication
var apiIntegrationAuth = function (req, res, next) {
  if (req.header('Wallet-API-Key') === process.env.API_INTEGRATION_KEY) {
    return next();
  } else {
    res.status(403).json('Forbidden');
  }
}

// Mount integrations route before CSRF is appended to the app stack
var integrationsRouter = require('./routes/integrations');
app.use('/v1/integrations', apiIntegrationAuth, integrationsRouter);

// CSRF protection
const csrfProtection = csurf({ cookie: true, domain: '.seedtoken.test' });
app.use(csrfProtection);
app.use(function (err, req, res, next) {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  res.locals._csrf = req.csrfToken();
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  return res.status(403).json({"errors":{"_":{"message":"validation.csrf_token"}}});
});
// app.use(express.static(path.join(__dirname, '../public')));

// Session
app.use(session);

// Passport
const passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Routes
var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth')(passport, csrfProtection);
var profileRouter = require('./routes/profile')(passport, csrfProtection);
var usersRouter = require('./routes/users')(passport, csrfProtection);
var walletRouter = require('./routes/wallet')(passport, csrfProtection);
var componentsRouter = require('./routes/components')(passport, csrfProtection);
var botsRouter = require('./routes/bots')(passport, csrfProtection);

app.use('/', cors(corsOptions), indexRouter);
app.use('/v1/auth', cors(corsOptions), authRouter);
app.use('/v1/profile', cors(corsOptions), profileRouter);
app.use('/v1/users', cors(corsOptions), usersRouter);
app.use('/v1/wallet', cors(corsOptions), walletRouter);
app.use('/v1/components', cors(corsOptions), (req, res, next) => {
  req.serviceOnly = false;
  next();
}, componentsRouter);
app.use('/v1/services', cors(corsOptions), (req, res, next) => {
  req.serviceOnly = true;
  next();
}, componentsRouter);
app.use('/v1/bots', cors(corsOptions), botsRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res) { // next
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Manage unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('An uncaught error occurred!');
  console.error(err.stack);
  throw err;
});

module.exports = app;
