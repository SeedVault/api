var express = require('express');
var router = express.Router();
const { UserService, UserNotFoundError } = require('../../lib/users/services/UserService');

module.exports = function (passport, csrfProtection) {

  /**
   * GET /v1/users/:username
   */
  router.get('/:username', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const user = await UserService.findUserByUsername(req.params.username);
        const data = {
          // id: user.id,
          username: user.username,
          countryCode: user.countryCode,
          pictureUrl: user.pictureUrl,
          accountStatus: user.accountStatus,
        }
        res.json(data);
      } catch (err) {
        if (err instanceof UserNotFoundError) {
          res.status(404).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    }
  );

  return router;

};
