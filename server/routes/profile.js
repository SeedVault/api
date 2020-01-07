var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const { UserService, InvalidCredentialsError, PasswordsDontMatchError } =
  require('../../lib/users/services/UserService');
const fs = require('fs');
const {resolve} = require("path");
var multer  = require('multer')
var storage = multer.diskStorage({
  destination: resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/accounts-users/`),
  filename: function (req, file, cb) {
    // cb(null, `${req.params.id}.jpg`);
    const timestamp = new Date().getTime().toString();
    cb(null, `${timestamp}.jpg`);
  }
})
const imageFilter = function (req, file, cb) {
  if (file.mimetype !== 'image/jpeg') {
    return cb(new Error('Only JPG image files are allowed'), false);
  }
  cb(null, true);
}
var upload = multer({ storage: storage, fileFilter: imageFilter });

module.exports = function (passport, csrfProtection) {

  /**
   * GET /v1/profile/me
   */
  router.get('/me', csrfProtection,
    async function (req, res, next) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const user = await UserService.findMyUserById(req.user.username, req.user.id);
        const data = {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          countryCode: user.countryCode,
          role: user.role,
          pictureUrl: user.pictureUrl,
        }
        res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /v1/profile/me/change-picture
   */
  router.post('/me/change-picture', csrfProtection, upload.single('pictureFile'),
    async function (req, res, next) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const user = await UserService.findMyUserById(req.user.username, req.user.id);
        const oldFile = resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/accounts-users/${user.picture}`)
        if (user.picture !== '') {
          if (fs.existsSync(oldFile)) {
            fs.unlink(oldFile, (err) => {
              if (err) {
                console.error(err)
                return
              }
            })
          }
        }
        user.picture = req.file.filename;
        const data = await UserService.updateUser(req.user.username, user);
        /* let passportUser = JSON.parse(req.session.passport.user);
        passportUser.picture = data.pictureUrl;
        req.session.passport.user = JSON.stringify(passportUser);
        req.session.save(); */
        res.status(200).json(data.pictureUrl);
      } catch (err) {
        next(err);
      }
    }
  );


  /**
   * POST /v1/profile/me/update
   */
  router.post('/me/update', csrfProtection,
  async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const user = await UserService.findMyUserById(req.user.username, req.user.id);
        user.firstname = req.body.profile.firstname || '';
        user.lastname = req.body.profile.lastname || '';
        user.email = req.body.profile.email || '';
        user.countryCode = req.body.profile.countryCode || '';
        user.role = req.body.profile.role || '';
        await UserService.updateUser(req.user.username, user);
        /* let passportUser = JSON.parse(req.session.passport.user);
        passportUser.email = user.email;
        req.session.passport.user = JSON.stringify(passportUser);
        req.session.save();
        res.json('ok'); */
        res.status(200).json({'updated': true});
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(422).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    },
  );


  /**
   * POST /v1/profile/me/change-password
   */
  router.post('/me/change-password', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const password = req.body.password || '';
        const newPassword = req.body.newPassword || '';
        const repeatNewPassword = req.body.repeatNewPassword || '';
        await UserService.changePassword(req.user.email, password, newPassword, repeatNewPassword);
        res.json('ok');
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          if (err.errors._) {
            err.errors.password = err.errors._;
            err.errors._.message = 'profile.wrong_password';
            err.errors._.path = 'password';
            delete(err.errors._);
          }
        }
        if (err instanceof PasswordsDontMatchError) {
          if (err.errors._) {
            err.errors.newPassword = err.errors._;
            err.errors._.message = 'domain.user.validation.passwords_dont_match';
            err.errors._.path = 'newPassword';
            delete(err.errors._);
          }
        }

        if (err instanceof ValidationError) {
          res.status(422).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    },
  );

  return router;

};
