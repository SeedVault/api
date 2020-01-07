var passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { UserService } = require('../../lib/users/services/UserService');

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new LocalStrategy(
  {
    // define the parameter in req.body that passport can use as username and password
    usernameField: 'usernameOrEmail',
    passwordField: 'password',
  },
  async function(username, password, done) {
    try {
      const user = await UserService.loginWithPassword(username, password);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }
));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(async function(id, cb) {
  try {
    let user = await UserService.findUserById(id);
    return cb(null, {
      'id': user.id,
      'username': user.username,
      'email': user.email,
      'firstname': user.firstname,
      'lastname': user.lastname,
      'picture': user.pictureUrl,
    });
  } catch (err) {
    return cb(err, false);
  }
});

module.exports = passport;
