const ValidationError = require('mongoose/lib/error/validation');
const { Bot, BotSubscription } = require('../entities/Bot');
const ObjectId = require('mongodb').ObjectID;

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
    return await bot.save();
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
    return await Bot.deleteOne({_id: id});
  },

  findSubscriptionsByUser: async (userId) => {
    const subscriptions = await BotSubscription.find({id: userId}).exec();
    return subscriptions;
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
  // BotEngineRequiredError,
  // ChannelRequiredError,
}
