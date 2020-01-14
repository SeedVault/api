var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const { WalletService } = require('../../lib/wallet/services/WalletService');

module.exports = function () {

  /**
   * GET /v1/integrations/wallet/balance
   */
  router.get('/wallet/balance',
    async function (req, res) {
      try {
        const username = req.query.username || '';
        const data = await WalletService.getWalletProfile(username);
        res.status(200).json(data);
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(422).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    }
  );

  /**
   * POST /v1/integrations/wallet/send
   */
  router.post('/wallet/send',
    async function (req, res) {
      try {
        const data = await WalletService.send(
          req.user.username,
          req.body.to,
          req.body.amount,
          true
        );
        res.status(200).json(data);
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
