import {
  UserService as userService, InvalidCredentialsError,
  UnverifiedAccountError, DisabledAccountError, InvalidReferralCodeError
} from '../../../lib/users/services/UserService';
import ValidationError from 'mongoose/lib/error/validation';
import { common } from '../common';

describe('The Sign Up from', () => {
  it('should save valid data', async () => {
    expect(await common.createJohnDoe()).toHaveProperty('_id');
  });

  it('should throw validation errors when passed empty data', async () => {
    await common.createReferralCode();
    await expect(
      userService.saveRegistrationForm(
        '',
        '',
        '',
        '',
        '',
        '',
        'TESTCODE01',
        '',
      )
    ).rejects.toThrowError(ValidationError);
  });


  it('should throw a validation error when the username is already in use', async () => {
    const user = await common.createJohnDoe();
    await expect(
      common.createUser('new@email.com', user.username.toUpperCase())
    ).rejects.toThrow(/domain.user.validation.unique_username/);
  });

  it('should throw a validation error when the e-mail is already in use', async () => {
    const user = await common.createJohnDoe();
    await expect(
      common.createUser(user.email, 'newUsername')
    ).rejects.toThrow(/domain.user.validation.unique_email/);
  });

  it('should throw a validation error when the referral code is invalid', async () => {
    await expect(
      userService.saveRegistrationForm(
        'testusername',
        'testusername@email.com',
        'John',
        'Doe',
        'us',
        'user',
        'INVALID_CODE',
        'secret',
      )
    ).rejects.toThrowError(InvalidReferralCodeError);
  });
});


describe('The Sign In form', () => {
  it('should allow a verified user to log in with a valid e-mail and password', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const loggedInUser = await userService.loginWithPassword(user.email.toUpperCase(), 'secret');
    expect(loggedInUser.normalizedEmail).toBe('johndoe@email.com');
  });

  it('should allow a verified user to log in with a valid username and password', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const loggedInUser = await userService.loginWithPassword(user.username.toUpperCase(), 'secret');
    expect(loggedInUser.normalizedUsername).toBe('johndoe');
  });

  it('should throw validation errors when passed empty data', async () => {
    await expect(
      userService.loginWithPassword()
    ).rejects.toThrowError(ValidationError);
  });

  it('should throw an "unverified account" error when an unverified user tries to log in.', async () => {
    const user = await common.createJohnDoe();
    await expect(
      userService.loginWithPassword(user.email, 'secret')
    ).rejects.toThrowError(UnverifiedAccountError);
  });

  it('should throw an "invalid credentials" error when passed a wrong password', async () => {
    await common.createJohnDoe();
    await expect(
      userService.loginWithPassword('johndoe@email.com', 'wrong')
    ).rejects.toThrowError(InvalidCredentialsError);
  });

  it('should throw a "disabled account" error when a user with a disabled account tries to log in.', async () => {
    const user = await common.createAndVerifyJohnDoe();
    await userService.disableAccount(user);
    await expect(
      userService.loginWithPassword(user.email, 'secret')
    ).rejects.toThrowError(DisabledAccountError);
  });
});

describe('Profile API', () => {
  it('should retrieve a map of verified profiles by username, email and walletAddress', async () => {
    const john = await common.createAndVerifyUser('johndoe@email.com', 'johndoe');
    const jane = await common.createAndVerifyUser('janedoe@email.com', 'janedoe');
    const mike = await common.createAndVerifyUser('mikedoe@email.com', 'mikedoe');
    const unverified = await common.createUser('unverified@email.com', 'unverified');
    const results = await userService.searchProfiles(
      [john.walletAddress, jane.email, mike.username, unverified.username],
    );
    expect(results[john.walletAddress].email).toBe(john.email);
    expect(results[jane.email].email).toBe(jane.email);
    expect(results[mike.username].email).toBe(mike.email);
    expect(results[unverified.username]).toBe(undefined);
  });

  it('should retrieve an empty map when search keywords are empty', async () => {
    const results = await userService.searchProfiles([]);
    expect(results.length).toBe(0);
  });

  it('should retrieve an empty map when search results are empty', async () => {
    const results = await userService.searchProfiles(['doNotExist']);
    expect(results.length).toBe(0);
  });
});
