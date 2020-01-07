import {
  BotService,// BotNotFoundError, // BotEngineRequiredError, BotNotFoundError, ForbiddenBotError,
} from '../../../lib/bots/services/BotService';
import ValidationError from 'mongoose/lib/error/validation';
import { common } from '../common';

describe('Bots', () => {

  it('should create a valid bot', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const components = await common.createDummyComponents(user);
    const bot = await common.createBot('my bot', components, user);
    expect(bot).toHaveProperty('_id');
    const savedBot = await BotService.findBotById(bot._id, user.id);
    expect(savedBot.name).toBe(bot.name);
  });

  //  eslint-disable-next-line jest/no-commented-out-tests
  /* it('should throw a "bot engine required" error when a bot engine is missing', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const components = await common.createDummyComponents(user);
    const bot = await common.getEmptyBot('my bot', components, user);
    bot.botEngine = {};
    await expect(
      BotService.createBot(bot)
    ).rejects.toThrowError(BotEngineRequiredError);
  }); */

  it('should throw a "bot not found" error when passed a wrong bot id', async () => {
    await expect(
      await BotService.findBotById()
    ).rejects.toThrowError(ValidationError);
  });
});
