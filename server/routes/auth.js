var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const LoginCredentials = require('../../lib/users/validators/LoginCredentials');
const VerificationCredentials = require('../../lib/users/validators/VerificationCredentials');
const { UserService } = require('../../lib/users/services/UserService');

module.exports = function (passport, csrfProtection) {

  /**
   * GET /auth/me
   */
  router.get('/me', csrfProtection,
    function (req, res) {
      if (req.user) {
        return res.status(200).json({csrfToken: req.csrfToken(), user: req.user });
      } else {
        return res.status(401).json({csrfToken: req.csrfToken() });
      }
    }
  );


  /**
   * POST /auth/sign-in
   */
  router.post('/sign-in', async (req, res, next) => {
    // Validate params to avoid the generic "Missing credentials" message
    var credentials = new LoginCredentials({
      usernameOrEmail: req.body.usernameOrEmail,
      password: req.body.password,
    });
    try {
      await LoginCredentials.check(credentials);
      passport.authenticate('local', (err, user, info) => {
        if (err) {
          return res.status(422).json(err);
        }
        if (info) {return res.send(info.message)}
        if (err) { return next(err); }
        if (!user) { return res.status(401).json({ authenticated: false }); }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.status(200).json({ authenticated: true });
        })
      })(req, res, next);
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(422).json(err);
      } else {
        return res.status(500).json(err);
      }
    }
  });


  /**
   * GET /auth/logout
   */
  router.get('/logout', function(req, res) {
    req.logout();
    req.session.destroy(function() {
      return res.status(200).json({ logout: true });
    });
  });


  /**
   * POST /auth/sign-up
   */
  router.post('/sign-up', async (req, res) => {
    try {
      let referralCode = '';
      if (process.env.VUE_APP_API_BETA_ONLINE === 'yes') {
        referralCode = 'BETA';
      } else {
        referralCode = req.body.referralCode;
      }
      await UserService.saveRegistrationForm(
        req.body.username,
        req.body.email,
        req.body.firstname,
        req.body.lastname,
        req.body.countryCode,
        req.body.role,
        referralCode,
        req.body.password,
        req.body.recaptchaToken,
      );
      res.status(201).json({saved: true});
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(422).json(err);
      } else {
        res.status(500).json(err);
      }
    }
  });


  /**
   * POST /auth/send-verification-email
   */
  router.post('/send-verification-email', async (req, res) => {
    try {
      const user = await UserService.findUserByEmail(req.body.email);
      await UserService.sendVerificationCodeByEmail(user.email, req.body.locale);
      res.status(200).json({sent: true});
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(422).json(err);
      } else {
        return res.status(500).json(err);
      }
    }
  });




  /**
   * POST /auth/verify-email-code
   */
  router.post('/verify-email-code', async (req, res) => {
    try {
      var credentials = new VerificationCredentials({
        email: req.body.email,
        verificationCode: req.body.verificationCode,
        recaptchaToken: req.body.recaptchaToken,
      });
      await VerificationCredentials.check(credentials);
      let user = await UserService.loginWithVerificationCode(
        credentials.email,
        credentials.verificationCode,
        credentials.recaptchaToken,
      );
      req.login(user, function (err) {
        if (!err){
          res.status(200).json({verified: true});
        } else {
          return res.status(500).json(err);
        }
      });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(422).json(err);
      } else {
        return res.status(500).json(err);
      }
    }
  });


  /**
   * POST /auth/forgot-password
   */
  router.post('/forgot-password', async (req, res) => {
    try {
      await UserService.resetPasswordWithVerificationCode(
        req.body.email,
        req.body.verificationCode,
        req.body.newPassword,
        req.body.repeatNewPassword
      );
      res.status(200).json({saved: true});
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(422).json(err);
      } else {
        return res.status(500).json(err);
      }
    }
  });


  return router;

};

