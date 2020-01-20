var express = require('express');
var router = express.Router();
const { ReviewService } = require('../../lib/bots/services/ReviewService');
const ValidationError = require('mongoose/lib/error/validation');

module.exports = function (passport, csrfProtection) {

  /**
   * GET /v1/reviews/:instanceType/:instanceId
   */
  router.get('/:instanceType/:instanceId', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const review = await ReviewService.findReview(
          req.params.instanceType,
          req.params.instanceId,
          req.user.id,
        )
        res.status(200).json(review);
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
   * POST /v1/reviews/:instanceType/:instanceId
   */
  router.post('/:instanceType/:instanceId', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const result = await ReviewService.saveReview(
          req.params.instanceType,
          req.params.instanceId,
          req.user,
          req.body.rating,
          req.body.comments,
        )
        res.status(200).json(result);
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
