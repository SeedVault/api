const { User, ReferralCode, AccountStatus } = require('../entities/User');
const LoginCredentials = require('../validators/LoginCredentials');
const PasswordResetCode = require('../validators/PasswordResetCode');
const PasswordChange = require('../validators/PasswordChange');
const mailer = require('../../infrastructure/mailer');
const ValidationError = require('mongoose/lib/error/validation');
const { SeedTokenAPIClientEthereumETHPersonal } = require('@seed-vault/seedtoken-api-client');
const axios = require("axios");

class UserNotFoundError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'UserNotFoundError';
    this.errors['_'] = { message: 'domain.user.validation.user_not_found' };
  }
}

class ForbiddenUserError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenUserError';
    this.errors['_'] = { message: 'domain.user.validation.forbidden_user' };
  }
}

class PasswordsDontMatchError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'PasswordsDontMatch';
    this.errors['_'] = { message: 'domain.user.validation.passwords_dont_match' };
  }
}

class InvalidCodeError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidCodeError';
    this.errors['_'] = { message: 'domain.user.validation.code_not_valid' };
  }
}

class InvalidCredentialsError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidCredentialsError';
    this.errors['_'] = { message: 'domain.user.validation.invalid_credentials' };
  }
}

class UnverifiedAccountError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'UnverifiedAccountError';
    this.errors['_'] = { message: 'domain.user.validation.account_unverified' };
  }
}

class DisabledAccountError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'DisabledAccountError';
    this.errors['_'] = { message: 'domain.user.validation.account_disabled' };
  }
}

class InvalidReferralCodeError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidReferralCodeError';
    this.errors['referralCode'] = { message: 'domain.user.validation.referral_code_not_valid' };
  }
}

class InvalidRecaptchaError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidRecaptchaError';
    this.errors['_'] = { message: 'domain.user.validation.invalid_recaptcha' };
  }
}


const UserService = {

  createReferralCode: async(referralCode) => {
    let rc = await ReferralCode.findOne({ referralCode }).exec();
    if (!rc) {
      rc = new ReferralCode({ referralCode });
      return await rc.save();
    }
    return rc;
  },

  referralCodeExist: async (referralCode) => {
    let rc = await ReferralCode.findOne({ referralCode: referralCode, enabled: true }).exec();
    if (!rc) {
      return false;
    }
    return true;
  },

  validateRecatpchaToken: async (recaptchaToken) => {
    if (process.env.NODE_ENV === 'test') {  // It's always true for automated testing
      return;
    }
    try {
      let result = await axios({
        method: 'post',
        url: 'https://www.google.com/recaptcha/api/siteverify',
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken
        }
      });
      let data = result.data || {};
      if (typeof data.success === 'undefined' || data.success !== true) {
        throw new InvalidRecaptchaError();
      }
    } catch (err) {
      throw new InvalidRecaptchaError();
    }
  },

  saveRegistrationForm: async (username, email, firstname, lastname, countryCode,
    role, referralCode, plaintextPassword, recaptchaToken) => {
      let normalizedUsername = '';
      // let normalizedEmail = '';
      // let normalizedWalletAddress = '';
      await UserService.validateRecatpchaToken(recaptchaToken);
      if (referralCode !== '') {
        let rc = await ReferralCode.findOne({ referralCode: referralCode, enabled: true }).exec();
        if (rc == null) {
          throw new InvalidReferralCodeError();
        }
      }

      if (username) {
        normalizedUsername = username.toLowerCase();
      }
      if (email) {
        // normalizedEmail = email.toLowerCase();
        // normalizedWalletAddress = normalizedEmail;
      }
      let user = new User({
        username,
        normalizedUsername,
        email,
        firstname,
        lastname,
        countryCode,
        role,
        referralCode,
        password: plaintextPassword,
        walletAddress: email,  // unique arbitrary value
      });
      try {
        return await user.save();
      } catch (err) {
        if (err instanceof ValidationError) {
          if (err.errors.normalizedUsername) {
            if (err.errors.normalizedUsername.message == 'domain.user.validation.unique_normalizedUsername') {
              err.errors.username = err.errors.normalizedUsername;
              err.errors.username.message = 'domain.user.validation.unique_username';
              err.errors.username.path = 'username';
              delete(err.errors.normalizedUsername);
            }
          }
        }
        if (err instanceof ValidationError) {
          if (err.errors.normalizedEmail) {
            if (err.errors.normalizedUsername.message == 'domain.user.validation.unique_normalizedEmail') {
              err.errors.email = err.errors.normalizedEmail;
              err.errors.email.message = 'domain.user.validation.unique_email';
              err.errors.email.path = 'email';
              delete(err.errors.normalizedEmail);
            }
          }
        }
        if (err instanceof ValidationError) {
          if (err.errors.normalizedWalletAddress) {
            if (err.errors.normalizedUsername.message == 'domain.user.validation.unique_normalizedWalletAddress') {
              err.errors.walletAddress = err.errors.normalizedWalletAddress;
              err.errors.walletAddress.message = 'domain.user.validation.unique_walletAddress';
              err.errors.walletAddress.path = 'walletAddress';
              delete(err.errors.normalizedWalletAddress);
            }
          }
        }
        throw err;
      }
  },

  findUserById: async (id) => {
    let user = await User.findById(id).exec();
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  },

  findMyUserById: async (username, id) => {
    let user = await User.findById(id).exec();
    if (!user) {
      throw new UserNotFoundError();
    }
    if (user.username === username) {
      return user;
    } else {
      throw new ForbiddenUserError('');
    }
  },

  findUserByUsername: async (username) => {
    const query = {
      normalizedUsername: username.toLowerCase()
    }
    let user = await User.findOne(query).exec();
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  },

  findUserByUsernameOrEmail: async (usernameOrEmail) => {
    const query = {$or: [
      { normalizedEmail: usernameOrEmail.toLowerCase() },
      { normalizedUsername: usernameOrEmail.toLowerCase() }
    ]}
    let user = await User.findOne(query).exec();
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  },

  findUserByEmail: async (email) => {
    let user = await User.findOne({ normalizedEmail: email.toLowerCase() }).exec();
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  },

  disableAccount: async(user) => {
    user.accountStatus = AccountStatus.DISABLED;
    await user.save();
  },

  sendVerificationCodeByEmail: async (email, locale) => {
    let user = await UserService.findUserByEmail(email);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new DisabledAccountError();
    }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    let template = 'signup-verification-code';
    if (user.accountStatus == AccountStatus.VERIFIED) {
      template = 'forgot-password';
    }
    const sender = `${process.env.VUE_APP_API_SEED_EMAIL_DESCRIPTION} <${process.env.VUE_APP_API_SEED_EMAIL_ADDRESS}>`;
    await user.save();
    await mailer.send({
      from: sender,
      to: email,
      locale: locale,
      folder: 'users',
      template: template,
      params: {
        code: verificationCode
      }
    });
  },

  loginWithPassword: async (usernameOrEmail, plaintextPassword) => {
    var credentials = new LoginCredentials({
      usernameOrEmail,
      password: plaintextPassword
    });
    await LoginCredentials.check(credentials);
    let user = await UserService.findUserByUsernameOrEmail(usernameOrEmail);
    let match = await user.comparePassword(plaintextPassword);
    if (!match) {
      throw new InvalidCredentialsError();
    }
    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new DisabledAccountError();
    }
    if (user.accountStatus === AccountStatus.UNVERIFIED) {
      throw new UnverifiedAccountError();
    }
    user.lastLogin = Date.now();
    await user.save();
    return user;
  },

  loginWithVerificationCode: async (email, plaintextVerificationCode, recaptchaToken) => {
    let user = await UserService.findUserByEmail(email);
    await UserService.validateRecatpchaToken(recaptchaToken);
    let match = await user.compareVerificationCode(plaintextVerificationCode);
    if (!match) {
      throw new InvalidCodeError();
    }
    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new DisabledAccountError();
    }
    if (user.accountStatus === AccountStatus.UNVERIFIED) {
      const st = SeedTokenAPIClientEthereumETHPersonal.getInstance(process.env.PARITY_HTTP_URL);
      user.walletAddress = await st.createAccount(process.env.PARITY_TEST_ADDRESS_PASSPHRASE || '');
      await st.transfer(
        process.env.PARITY_TEST_ADDRESS,
        user.walletAddress,
        '1000',
        process.env.PARITY_TEST_ADDRESS_PASSPHRASE
      );
      user.accountStatus = AccountStatus.VERIFIED;
      user.verificationCode = '';  // Reset verification code
      await user.save();
    }
    user.lastLogin = Date.now();
    await user.save();
    return user;
  },

  resetPasswordWithVerificationCode: async (email, plaintextVerificationCode,
    plaintextNewPassword, plaintextRepeatNewPassword) => {
    var data = new PasswordResetCode({
        email,
        verificationCode: plaintextVerificationCode,
        newPassword: plaintextNewPassword,
        repeatNewPassword: plaintextRepeatNewPassword
      });
    await PasswordResetCode.check(data);
    let user = await UserService.findUserByEmail(data.email);
    let match = await user.compareVerificationCode(data.verificationCode);
    if (!match) {
      throw new InvalidCodeError();
    }
    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new DisabledAccountError();
    }
    if (data.newPassword !== data.repeatNewPassword) {
      throw new PasswordsDontMatchError();
    }
    user.verificationCode = '';  // Reset verification code
    user.password = data.newPassword;
    await user.save();
  },

  searchProfiles: async (searchKeywords) => {
    if (searchKeywords.length === 0) {
      return new Array();
    }
    let keywords = new Array();
    for (let i = 0; i < searchKeywords.length; i++) {
      if (!keywords.includes(searchKeywords[i].toLowerCase())) {
        keywords.push(searchKeywords[i].toLowerCase());
      }
    }
    let users = await User.find({$or:[
      {'normalizedUsername': { $in: keywords }},
      {'normalizedEmail': { $in: keywords }},
      {'normalizedWalletAddress': { $in: keywords }}
    ]}).exec();
    let results = new Array();
    for (let i = 0; i < users.length; i++) {
      for (let j = 0; j < searchKeywords.length; j++) {
        let user = users[i];
        let k = String(searchKeywords[j]);
        let nk = k.toLowerCase();
        if (user.normalizedUsername === nk || user.normalizedEmail === nk || user.normalizedWalletAddress === nk) {
          if (user.accountStatus !== AccountStatus.UNVERIFIED) {
            results[k] = {
              username: user.username,
              email: user.email,
              walletAddress: user.walletAddress,
              picture: user.picture,
              createdAt: user.createdAt
            };
          }
          break;
        }
      }
    }
    return results;
  },

  updateUser: async (username, user) => {
    await UserService.findMyUserById(username, user.id);
    return await user.save();
  },

  changePassword: async (email, plaintextCurrentPassword,
    plaintextNewPassword, plaintextRepeatNewPassword) => {
    var data = new PasswordChange({
        email,
        password: plaintextCurrentPassword,
        newPassword: plaintextNewPassword,
        repeatNewPassword: plaintextRepeatNewPassword
      });
    await PasswordChange.check(data);
    let user = await UserService.loginWithPassword(data.email, data.password);
    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new DisabledAccountError();
    }
    if (data.newPassword !== data.repeatNewPassword) {
      throw new PasswordsDontMatchError();
    }
    user.password = data.newPassword;
    await user.save();
  },

  referralCodeReport: async () => {
    const report = await User.find(
      {},
      'username firstname lastname referralCode email createdAt lastLogin'
    ).sort({ 'createdAt': -1 }).exec();
    return report;
  },

};

module.exports = {
  UserNotFoundError,
  ForbiddenUserError,
  InvalidCredentialsError,
  UnverifiedAccountError,
  DisabledAccountError,
  PasswordsDontMatchError,
  InvalidReferralCodeError,
  UserService,
}
