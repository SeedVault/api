var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const { WalletService } = require('../../lib/wallet/services/WalletService');

module.exports = function (passport, csrfProtection) {

  /**
   * GET /v1/wallet/me/dashboard
   */
  router.get('/me/dashboard', csrfProtection,
    async function (req, res, next) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const data = await WalletService.getDashboardInfo(req.user.username);
        res.status(200).json(data);
      } catch (err) {
        next(err);
      }
    }
  );


  /**
   * GET /v1/wallet/me
   */
  router.get('/me', csrfProtection,
    async function (req, res, next) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const data = await WalletService.getWalletProfile(req.user.username);
        res.status(200).json(data);
      } catch (err) {
        next(err);
      }
    }
  );


  /**
   * POST /v1/wallet/verify
   */
  router.post('/verify', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const data = await WalletService.send(
          req.user.username,
          req.body.to,
          req.body.amount,
          false
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


  /**
   * POST /v1/wallet/send
   */
  router.post('/send', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
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
