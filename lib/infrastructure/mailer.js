const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

let transport = {};

switch (process.env.NODE_ENV) {
  case 'test':
    // Mock
    transport = {
      inbox: [],
      sendMail: function(msg) {
        this.inbox.unshift(msg);
      },
      getLastMessage: function() {
        return this.inbox[0];
      }
    }
    break;
  case 'production':
    // Sendgrid
    transport = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 465,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
    break;
  default:
    // MailHog at localhost
    transport = nodemailer.createTransport({
      host: process.env.MAILHOG_HOST,
      port: process.env.MAILHOG_SMTP_PORT,
      secure: false,
      auth: null
    });
    break;
}

let mailer = {

  send: async (email) => {
    // Validate locale
    let templatesPath = path.join(__dirname, '..', email.folder, 'templates',
      'e-mails');
    const availableLocales = fs.readdirSync(templatesPath);
    if (availableLocales.includes(email.locale) === false) {
      email.locale = 'en';
    }
    templatesPath = path.join(templatesPath, email.locale);
    // Load template for locale
    let templateJson = `${templatesPath}/${email.template}.json`;
    let templateHtml = `${templatesPath}/${email.template}.ejs`;
    let templateText = `${templatesPath}/${email.template}.txt`;
    let rawJsonData = fs.readFileSync(templateJson);
    let jsonData = JSON.parse(rawJsonData);
    let msg = {
      from: email.from,
      to: email.to,
      subject: jsonData.subject,
    };
    msg.html = await ejs.renderFile(templateHtml, email.params, { async:true });
    msg.text = await ejs.renderFile(templateText, email.params, { async:true });
    return await transport.sendMail(msg);
  },

  getTransport: () => {
    return transport;
  },

}

module.exports = mailer;
