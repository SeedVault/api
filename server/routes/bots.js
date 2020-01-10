var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const { BotService, ForbiddenBotError } =
  require('../../lib/bots/services/BotService');
const { UserService } = require('../../lib/users/services/UserService');
const fs = require('fs');
const {resolve} = require("path");
var multer  = require('multer')
var storage = multer.diskStorage({
  destination: resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/greenhouse-bots/`),
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


  function deserializeMaps(data) {
    const collectionNames = ['botengine', 'services', 'channels'];
    for (let i = 0; i < collectionNames.length; i++) {
      const c = collectionNames[i];
      for (let j = 0; j < data[c].length; j++) {
        data[c][j].values = new Map(JSON.parse(data[c][j].values));
      }
    }
    if (data.botengine.length === 1) {
      data.botengine = data.botengine[0];
    }
    return data;
  }

  /**
   * POST /v1/bots/save
   */
  router.post('/save', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        // Deserialize custom Map fields
        const data = deserializeMaps(req.body.bot);
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


  /**
   * POST /v1/bots/:id/change-picture
   */
  router.post('/:id/change-picture', csrfProtection, upload.single('pictureFile'),
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const bot = await BotService.findBotById(req.params.id, req.user.id);
        const oldFile = resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/greenhouse-bots/${bot.picture}`)
        if (bot.picture !== '') {
          if (fs.existsSync(oldFile)) {
            fs.unlink(oldFile, (err) => {
              if (err) {
                console.error(err)
                return
              }
            })
          }
        }
        bot.picture = req.file.filename;
        const data = await BotService.updateBot(bot, req.user.id);
        res.status(200).json({ data });
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
  );


  /**
   * GET /v1/bots/:id
   */
  router.get('/:id', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const bot = await BotService.findBotById(req.params.id);
        res.status(200).json(bot);
      } catch (err) {
        if (err instanceof ForbiddenBotError) {
          return res.status(403).json(err);
        }
        if (err instanceof ValidationError) {
          return res.status(422).json(err);
        }
        return res.status(500).json(err);
      }
    },
  );


  /**
   * GET /v1/bots/:id/delete
   */
  router.delete('/:id/delete', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const bot = await BotService.findBotById(req.params.id, req.user.id);
        const oldFile = resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/greenhouse-bots/${bot.picture}`)
        if (bot.picture !== '') {
          if (fs.existsSync(oldFile)) {
            fs.unlink(oldFile, (err) => {
              if (err) {
                console.error(err)
                return
              }
            })
          }
        }
        const data = await BotService.deleteBotById(req.params.id, req.user.id);
        return res.status(200).json(data);
      } catch (err) {
        if (err instanceof ForbiddenBotError) {
          return res.status(403).json(err);
        }
        if (err instanceof ValidationError) {
          return res.status(422).json(err);
        }
        return res.status(500).json(err);
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
      let subscription = req.query.subscription || '';
      let subscriptorId = '';
      if (subscription === 'mine') {
        subscriptorId = req.user.id
      }
      const data = await BotService.findPaginatedBots(
        resultsPerPage,
        page,
        userId,
        search,
        status,
        sortBy,
        sortType,
        category,
        subscriptorId,
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


  /**
   * POST /v1/bots/:id/subscribe
   */
  router.post('/:id/subscribe', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        let botId = req.params.id;
        const subscriptionType = req.body.subscriptionType;
        let data = deserializeMaps(req.body.values);
        const subscription = await BotService.subscribe(
          req.user.username,
          botId,
          subscriptionType,
          data.properties,
          data.botengine,
          data.services,
          data.channels
        );
        res.status(200).json({saved: true, subscriptionId: subscription.id});
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
  );


  /**
   * POST /v1/bots/:id/unsubscribe
   */
  router.post('/:id/unsubscribe', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        let botId = req.params.id;
        await BotService.unsubscribe(req.user.username, botId);
        res.status(200).json({unsubscribed: true});
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
  );

  return router;

};
