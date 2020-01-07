import { UserService } from '../../lib/users/services/UserService';
import { ComponentService } from '../../lib/bots/services/ComponentService';
import { BotService } from '../../lib/bots/services/BotService';
import mailer from '../../lib/infrastructure/mailer';

const common = {

  createReferralCode: async function () {
    await UserService.createReferralCode('TESTCODE01');
  },

  createUser: async function (email, username) {
    return UserService.saveRegistrationForm(
      username,
      email,
      'John',
      'Doe',
      'us',
      'user',
      'TESTCODE01',
      'secret',
    );
  },

  createJohnDoe: async function () {
    await common.createReferralCode();
    return common.createUser('johndoe@email.com', 'johndoe');
  },

  getVerificationCodeFromLastEmail: async function () {
    const msg = mailer.getTransport().getLastMessage();
    return msg.html.match(/<\s*p class="code"[^>]*>(.*?)<\s*\/\s*p>/)[1];
  },

  createAndVerifyUser: async function (email, username) {
    await common.createReferralCode();
    const user = await common.createUser(email, username);
    await UserService.sendVerificationCodeByEmail(user.email, 'en');
    const verificationCode = await common.getVerificationCodeFromLastEmail();
    await UserService.loginWithVerificationCode(user.email, verificationCode);
    return UserService.findUserByEmail(user.email);
  },

  createAndVerifyJohnDoe: async function () {
    return common.createAndVerifyUser('johndoe@email.com', 'johndoe');
  },


  getEmptyComponent: async function (name, componentType, user) {
    if (typeof user === 'undefined') {
      user = await common.createAndVerifyJohnDoe();
    }
    const noSpaces = name.replace(/\s/g, '');
    const fn = noSpaces.charAt(0).toLowerCase() + noSpaces.slice(1);
    return {
      componentType: componentType,
      category: 'general',
      name: name,
      description: `Description of ${name}`,
      features: `Features of ${name}`,
      license: `License of ${name}`,
      key: `${fn}`,
      functionName: `${fn}Fn`,
      url: `https:/www.${noSpaces.toLowerCase()}.com`,
      httpMethod: 'GET',
      timeout: 30,
      pricingModel: 'free',
      pricePerUse: 0,
      pricePerMonth: 0,
      status: 'enabled',
      properties:[],
      headers:[],
      predefinedVars:[],
      mappedVars:[],
      user: user,
    }
  },

  createComponent: async function (name, componentType, user) {
    return ComponentService.createComponent(
      await common.getEmptyComponent(name, componentType, user)
    );
  },

  newProperty: function(id, propertyName) {
    let p = {
      name: propertyName.replace(/\s/g, ''),
      valueType: 'fixed',
      inputType: 'text',
      options: '',
      required: 'yes',
      value: 'test',
    };
    if (id !== '') {
      p._id = id;
    }
    return p;
  },

  createDummyComponents: async function (user) {
    const components = [];
    let chatscript = await common.getEmptyComponent('ChatScript', 'botengine', user);
    chatscript.properties.push(common.newProperty('', 'Bot ID'));
    chatscript.properties.push(common.newProperty('', 'Host'));
    chatscript.properties.push(common.newProperty('', 'Port'));
    let accuWeather = await common.getEmptyComponent('AccuWeather', 'service', user);
    accuWeather.predefinedVars.push(common.newProperty('', 'API Key'));
    accuWeather.mappedVars.push(common.newProperty('', 'v'));
    let googleTranslate = await common.getEmptyComponent('GoogleTranslate', 'service', user);
    let telegram = await common.getEmptyComponent('Telegram', 'channel', user);
    telegram.properties.push(common.newProperty('', 'Token'));
    components.chatscript = await ComponentService.createComponent(chatscript);
    components.accuWeather = await ComponentService.createComponent(accuWeather);
    components.googleTranslate = await ComponentService.createComponent(googleTranslate);
    components.telegram = await ComponentService.createComponent(telegram);
    return components;
  },

  getEmptyBot: async function (name, components, user) {
    if (typeof user === 'undefined') {
      user = await common.createAndVerifyJohnDoe();
    }
    const noSpaces = name.replace(/\s/g, '');
    const chatscriptValues = new Map();
    chatscriptValues.set(`_${components.chatscript.properties[0]._id}`, 'myId');
    chatscriptValues.set(`_${components.chatscript.properties[1]._id}`, 'http://127.0.0.1');
    chatscriptValues.set(`_${components.chatscript.properties[2]._id}`, '1024');
    const accuWeatherValues = new Map();
    accuWeatherValues.set(`_${components.accuWeather.predefinedVars[0]._id}`, 'myAccuWeatherKey');
    const googleTranslateValues = new Map();
    const telegramValues = new Map();
    telegramValues.set(`_${components.telegram.properties[0]._id}`, 'telegram3itqF3eoXaY');
    return {
      category: 'general',
      botId: noSpaces,
      name: name,
      description: 'This is my bot',
      features: 'Features of my bot',
      license: 'license here',
      pricingModel: 'free',
      pricePerUse: 0,
      pricePerMonth: 0,
      status: 'enabled',
      user: user,
      properties: [],
      botEngine: {
        component: components.chatscript._id,
        subscriptionType: 'month',
        values: chatscriptValues,
      },
      services: [
        {
          component: components.accuWeather._id,
          subscriptionType: 'month',
          values: accuWeatherValues,
        },
        {
          component: components.googleTranslate._id,
          subscriptionType: 'month',
          values: googleTranslateValues,
        },
      ],
      channels: [
        {
          component: components.telegram._id,
          subscriptionType: 'month',
          values: telegramValues,
        },
      ],
    }
  },

  createBot: async function (name, components, user) {
    const bot = await BotService.createBot(
      await common.getEmptyBot(name, components, user)
    );
    return bot;
  }

};


module.exports = {
  common,
}
