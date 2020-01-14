const db = require('../lib/infrastructure/database.js');
const { Bot, BotSubscription } = require('../lib/bots/entities/Bot');

async function main() {
  await db();
  process.stdout.write(`Exporting from ${process.env.API_DATABASE} to ${process.env.RHIZOME_DATABASE} ...`);

  // Export greenhouse_dotbots
  const allBots = await Bot.find().exec();
  const botPromises = allBots.map(async (bot) => {
    await bot.save();
  });
  await Promise.all(botPromises);

  // Export greenhouse_publisher_bots
  const allBotSubscriptions = await BotSubscription.find().exec();
  const botSubscriptionsPromises = allBotSubscriptions.map(async (botSubscription) => {
    try {
      await botSubscription.save();
    } catch (err) {
      console.log('* Unable to export bot subscription');
      console.log();
      console.log('DATA:', botSubscription);
      console.log();
      console.log('ERROR:', err);
      console.log('-------------------------------------------------------------');
    }
  });
  await Promise.all(botSubscriptionsPromises);
}

main().then(() => {
  console.log('done.\n');
  process.exit();
});
