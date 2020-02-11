var express = require('express');
var router = express.Router();
const { UserService } = require('../../lib/users/services/UserService');
const ValidationError = require('mongoose/lib/error/validation');

module.exports = function (passport, csrfProtection) {

  /**
   * GET /v1/stats/users
   */
  router.get('/users', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      const whitelist = process.env.VUE_APP_API_STATS_WHITELIST.split(',');
      if (!whitelist.includes(req.user.username.toLowerCase())) {
        return res.status(403).json('Forbidden');
      }
      try {
        const results = await UserService.referralCodeReport();
        let data = [];
        for (let i = 0; i < results.length; i += 1) {
          data.push({
            username: results[i].username,
            firstname: results[i].firstname,
            lastname: results[i].lastname,
            email: results[i].email,
            referralCode: results[i].referralCode,
            createdAt: results[i].createdAt,
            lastLogin: results[i].lastLogin
          });
        }
        res.json(data);
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(422).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    }
  );

  return router;

};
