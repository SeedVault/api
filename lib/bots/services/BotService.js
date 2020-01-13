const ValidationError = require('mongoose/lib/error/validation');
const { Bot, BotSubscription } = require('../entities/Bot');
const { UserService } = require('../../users/services/UserService');
const { Dotbot, DotbotPublisher } = require('../entities/Dotbot');
const { ComponentService } = require('./ComponentService');
const ObjectId = require('mongodb').ObjectID;
const uuid4 = require('uuid4');

class BotNotFoundError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'BotNotFoundError';
    this.errors['_'] = { message: 'domain.bot.validation.bot_not_found' };
  }
}

class ForbiddenBotError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenBotError';
    this.errors['_'] = { message: 'domain.bot.validation.forbidden_bot' };
  }
}

class BotSubscriptionNotFoundError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'BotSubscriptionNotFoundError';
    this.errors['_'] = { message: 'domain.bot.validation.bot_subscription_not_found' };
  }
}

/* class BotEngineRequiredError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'BotEngineRequiredError';
    this.errors['_'] = { message: 'domain.bot.validation.bot_engine_required' };
  }
}

class ChannelRequiredError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ChannelRequiredError';
    this.errors['_'] = { message: 'domain.bot.validation.channel_required' };
  }
} */

const BotService = {

  createBot: async (data) => {
    let bot = new Bot(data);
    const result = await bot.save();
    if (typeof result.id !== 'undefined') {
      let subscriptionType = '';
      switch(bot.pricingModel) {
        case 'pay_per_use':
          subscriptionType = 'use';
          break;
        case 'pay_per_month':
          subscriptionType = 'month';
          break;
        case 'pay_per_use_or_month':
          subscriptionType = 'use';
          break;
        default:
          subscriptionType = 'free';
          break;
      }
      await BotService.subscribe(result._id, data.user.id, subscriptionType, [],
        {component: data.botEngine.component, values: new Map()}, [], []);
    }
    return result;
  },

  updateBot: async (bot, userId) => {
    await BotService.findBotById(bot._id, userId);
    return await bot.save();
  },

  findBotById: async (id, userId) => {
    let bot = await Bot.findById(id).populate('user', 'username accountStatus').exec();
    if (!bot) {
      throw new BotNotFoundError();
    }
    if (typeof(userId) !== 'undefined') {
      if (bot.user.id.toString() === userId.toString()) {
        return bot;
      } else {
        throw new ForbiddenBotError('');
      }
    }
    return bot
  },

  deleteBotById: async (id, userId) => {
    await BotService.findBotById(id, userId);
    const result = await Bot.deleteOne({_id: id});
    await BotSubscription.deleteMany({'bot': id}).exec();
    await Dotbot.deleteOne({botId: id});
    await DotbotPublisher.deleteMany({botId: id});
    return result;
  },

  updateSubscriptionsCount: async(botId, userId) => {
    const subscriptionsCount = await BotSubscription.countDocuments({
      bot: botId,
      user: userId,
    });
    const bot = await BotService.findBotById(botId);
    bot.subscriptionsCount = subscriptionsCount;
    bot.save();
  },

  findSubscription: async (botId, userId) => {
    const bot = await BotService.findBotById(botId);
    let subscription = {
      token: '',
      properties: [],
      services: [],
      channels: [],
      botengine: {},
      bot: {
        id: bot.id,
        category: bot.category,
        pricePerUse: bot.pricePerUse,
        pricePerMonth: bot.pricePerMonth,
        picture: bot.picture,
        botId: bot.botId,
        name: bot.name,
        description: bot.description,
        features: bot.features,
        license: bot.license,
        pricingModel: bot.pricingModel,
        status: bot.status,
        createdAt: bot.createdAt,
        updatedAt: bot.updatedAt,
        pictureUrl: bot.pictureUrl,
        properties: [],
        services: [],
        channels: [],
        botengine: [],
        user: bot.user,
      }
    };

    // Bot only includes properties and component that have to be configured
    // by the publisher
    let publisherProps = [];
    for (let i = 0; i < bot.properties.length; i++) {
      if (bot.properties[i].valueType === 'publisher') {
        publisherProps.push(bot.properties[i]);
      }
    }
    if (publisherProps.length > 0) {
      subscription.bot.properties = [{
        _id: subscription.bot.id,
        name: subscription.bot.name,
        pictureUrl: subscription.bot.pictureUrl,
        properties: publisherProps,
        headers: [],
        predefinedVars: [],
        mappedVars: [],
      }];
    }
    const componentCollections = {
      botengine: [bot.botEngine],
      services: bot.services,
      channels: bot.channels,
    }
    const collectionNames = ['botengine', 'services', 'channels'];
    for (let i = 0; i < collectionNames.length; i++) {
      let collection = componentCollections[collectionNames[i]];
      for (let j = 0; j < collection.length; j++) {
        const p = await ComponentService.getPropertiesForValueType(collection[j].component, 'publisher');
        if (p.properties.length > 0 || p.headers.length > 0 || p.predefinedVars > 0 || p.mappedVars > 0) {
          subscription.bot[collectionNames[i]].push(p);
        }
      }
    }
    const results = await BotSubscription.findOne({ 'bot': botId, user: userId }).exec();
    if (results) {
      subscription.token = results.token;
      subscription.subscriptionType = results.subscriptionType;
      subscription.properties = results.properties;
      if (typeof results.properties !== 'undefined' && results.properties.size > 0) {
        subscription.properties = [{
          component: subscription.bot.id,
          values: results.properties,
        }];
      } else {
        subscription.properties = [];
      }
      subscription.services = results.services;
      subscription.channels = results.channels;
      if (typeof results.botEngine !== 'undefined') {
        subscription.botengine = [results.botEngine];
      } else {
        subscription.botengine = [];
      }
    }
    return subscription;
  },

  unsubscribe: async (botId, userId) => {
    let subscription = await BotSubscription.findOne({ 'bot': botId, user: userId }).exec();
    if (!subscription) {
      throw new BotSubscriptionNotFoundError();
    }
    const result = await BotSubscription.deleteOne({_id: subscription._id});
    const user = UserService.findUserById(userId);
    try {
      await DotbotPublisher.deleteOne({botId: botId, publisherName: user.username});
    } catch (err) {
      // do nothing
    }
    await BotService.updateSubscriptionsCount(botId, userId);
    return result;
  },

  findSubscriptionsByUser: async (userId) => {
    const subscriptions = await BotSubscription.find({user: userId}).exec();
    return subscriptions;
  },

  subscribe: async (botId, userId, subscriptionType, properties,
    botengine, services, channels) => {
    let subscription = await BotSubscription.findOne({ 'bot': botId, user: userId }).exec();
    if (!subscription) {
      subscription = new BotSubscription({});
      subscription.token = uuid4();
      subscription.user = userId;
      subscription.bot = botId;
    }
    subscription.subscriptionType = subscriptionType;
    subscription.properties = properties;
    subscription.services = services;
    subscription.channels = channels;
    subscription.botEngine = botengine;

    const result = await subscription.save();
    await BotService.updateSubscriptionsCount(botId, userId);
    return result;
  },

  findPaginatedBots: async (resultsPerPage, currentPage, userId, search, status,
    sortBy, sortType, category, subscriptorId) => {
    let query = {}
    let sorting = {}
    if (typeof subscriptorId !== 'undefined' && subscriptorId !== '') {
      const subscriptions = await BotService.findSubscriptionsByUser(subscriptorId);
      const ids = [];
      for (let i = 0; i < subscriptions.length; i += 1) {
        ids.push(ObjectId(subscriptions[i].bot));
      }
      query['_id'] = { $in: ids };
    }

    if (status !== 'enabled' && status !== 'disabled') {
      status = '';
    }
    if (sortBy !== 'name' && sortBy !== 'updatedAt') {
      sortBy = '';
    }
    if (sortType !== 'asc' && sortType !== 'desc') {
      sortType = 'asc';
    }
    // filters
    if (userId !== '' ) {
      query['user'] = userId;
    }
    if (search !== '') {
      query['$and'] = [{ $or: [{name: { $regex:  `.*${search}.*`, $options: 'i' }}, {description: { $regex:  `.*${search}.*`, $options: 'i' }}] }];
    }
    if (status !== '' ) {
      query['status'] = status;
    }
    if (category !== '' ) {
      query['category'] = category;
    }
    if (sortBy !== '' ) {
      sorting[sortBy] = sortType;
    }
    const results = await Bot.find(query)
      .select({
        "category": 1,
        "pricingModel": 1,
        "pricePerUse": 1,
        "pricePerMonth": 1,
        "picture": 1,
        "pictureUrl": 1,
        "user": 1,
        "botId": 1,
        "name": 1,
        "description": 1,
        "features": 1,
        "license": 1,
        "status": 1,
        "createdAt": 1,
        "updatedAt": 1
      })
      .populate({
        path: 'user',
        select: '_id username accountStatus',
      })
      .sort(sorting)
      .skip((resultsPerPage * currentPage) - resultsPerPage)
      .limit(resultsPerPage);
    const resultsCount = await Bot.countDocuments(query);
    const pagesCount = Math.ceil(resultsCount / resultsPerPage);
    return {
      results,
      resultsCount,
      currentPage,
      pagesCount,
    }
  },


}

module.exports = {
  BotNotFoundError,
  BotService,
  ForbiddenBotError,
  BotSubscriptionNotFoundError,
  // BotEngineRequiredError,
  // ChannelRequiredError,
}
