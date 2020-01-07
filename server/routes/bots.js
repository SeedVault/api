var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const { BotService, ForbiddenBotError } =
  require('../../lib/bots/services/BotService');
const { UserService } = require('../../lib/users/services/UserService');

module.exports = function (passport, csrfProtection) {

  /**
   * POST /v1/bots/save
   */
  router.post('/save', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const data = req.body.bot;
        // Strip field "_id" off from inner collections
        const collections = ['properties'];
        for (let i = 0; i < collections.length; i++) {
          let c = collections[i];
          if (typeof(data[c]) !== 'undefined') {
            for (let j = 0; j < data[c].length; j++) {
              if (data[c][j]._id === '') {
                delete data[c][j]._id;
              }
            }
          }
        }
        let bot = {};
        let id = data.id || '';
        if (id === '') {
          bot.user = await UserService.findMyUserById(req.user.username, req.user.id);
        } else {
          bot = await BotService.findBotById(id, req.user.id);
        }
        bot.category = data.category;
        bot.botId = data.botId;
        bot.name = data.name;
        bot.description = data.description;
        bot.features = data.features;
        bot.license = data.license;
        bot.pricingModel = data.pricingModel;
        bot.pricePerUse = data.pricePerUse;
        bot.pricePerMonth = data.pricePerMonth;
        bot.status = data.status;
        bot.properties = data.properties;
        bot.botEngine = data.botengine;
        bot.services = data.services;
        bot.channels = data.channels;
        if (id === '') {
          const result = await BotService.createBot(bot);
          id = result._id;
        } else {
          await BotService.updateBot(bot, req.user.id);
        }
        res.status(200).json({saved: true, id: id});
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(422).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    },
  );

  async function getPaginatedResults(req, res, screen) {
    if (!req.user) {
      return res.status(403).json('Forbidden');
    }
    try {
      let userId = '';
      if (screen === 'users') {
        const user = await UserService.findUserByUsername(req.params.username);
        userId = user.id;
      }
      const resultsPerPage = 10;
      const page = req.query.page || 1;
      const search = req.query.search || '';
      let status = req.query.status || '';
      let sortBy = req.query.sortBy || '';
      let sortType = req.query.sortType || 'asc';
      let category = req.query.category || '';
      const data = await BotService.findPaginatedBots(
        resultsPerPage,
        page,
        userId,
        search,
        status,
        sortBy,
        sortType,
        category
      );
      res.status(200).json(data);
    } catch (err) {
      if (err instanceof ForbiddenBotError) {
        return res.status(403).json(err);
      }
      if (err instanceof ValidationError) {
        return res.status(422).json(err);
      }
      return res.status(500).json(err);
    }
  }


  /**
   * GET /v1/bots/user/:username
   */
  router.get('/user/:username', csrfProtection,
    async function (req, res) {
      return await getPaginatedResults(req, res, 'users');
    },
  );


  /**
   * GET /v1/bots/
   */
  router.get('/', csrfProtection,
    async function (req, res) {
      return await getPaginatedResults(req, res, 'marketplace');
    },
  );

  return router;

};
