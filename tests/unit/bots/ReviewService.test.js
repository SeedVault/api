import {
  ReviewService, InstanceNotFoundError, InvalidInstanceTypeError,
  ReviewNotFoundError, ForbiddenReviewError,
} from '../../../lib/bots/services/ReviewService';
// import ValidationError from 'mongoose/lib/error/validation';
import { common } from '../common';

describe('Reviews', () => {

  it('should save a valid review of a component', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    expect(component.averageRating).toStrictEqual(0);
    expect(component.reviewsCount).toStrictEqual(0);
    // review should be empty
    let review = await ReviewService.findReview('component', component.id, user.id, '3', 'test');
    expect(review).toBeNull();
    // save review
    const result = await ReviewService.saveReview('component', component.id, user, '3', 'test');
    let savedReview = await ReviewService.findReview('component', component.id, user.id);
    expect(result.review._id).toStrictEqual(savedReview._id);
    // update review
    await ReviewService.saveReview('component', component.id, user, '5', 'test');
    review = await ReviewService.findReview('component', component.id, user.id);
    expect(review.rating).toBe(5);
  });

  it('should save a valid review of a bot', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const components = await common.createDummyComponents(user);
    const bot = await common.createBot('my bot', components, user);
    // review should be empty
    let review = await ReviewService.findReview('bot', bot.id, user.id, '3', 'test');
    expect(review).toBeNull();
    // save review
    const result = await ReviewService.saveReview('bot', bot.id, user, '3', 'test');
    let savedReview = await ReviewService.findReview('bot', bot.id, user.id);
    expect(result.review._id).toStrictEqual(savedReview._id);
    // update review
    await ReviewService.saveReview('bot', bot.id, user, '5', 'test');
    review = await ReviewService.findReview('bot', bot.id, user.id);
    expect(review.rating).toBe(5);
  });

  it('should throw a "invalid instance type" error when passed a wrong instance type', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    await expect(
      ReviewService.saveReview('invalid', component.id, user, '5', 'test')
    ).rejects.toThrowError(InvalidInstanceTypeError);
  });

  it('should throw a "instance not found" error when passed wrong instance parameters', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    await expect(
      ReviewService.saveReview('bot', component.id, user, '5', 'test')
    ).rejects.toThrowError(InstanceNotFoundError);
  });

  it('should retrieve paginated reviews', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const anotherUser = await common.createAndVerifyUser('another@user.com', 'anotheruser');
    let component = null;
    component = await common.createComponent('one', 'botengine', user);
    await ReviewService.saveReview('component', component.id, user, '3', 'test');  // new review
    await ReviewService.saveReview('component', component.id, user, '4', 'test');  // update review
    await ReviewService.saveReview('component', component.id, anotherUser, '5', 'test'); // create review
    const resultsPageOne = await ReviewService.findPaginatedReviews(2, 1, 'component', component.id);
    expect(resultsPageOne.results.length).toBe(2);
  });

  it('should throw a "invalid instance type" error when passed a wrong instance type to pagination'
  , async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('chatscript', 'botengine', user);
    await expect(
      ReviewService.findPaginatedReviews(2, 1, 'invalid', component.id)
    ).rejects.toThrowError(InvalidInstanceTypeError);
  });

  it('should delete a review if the user is an administrator', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const admin = await common.createAndVerifyUser('admin@user.com', process.env.VUE_APP_API_ADMIN_USERNAME);
    const component = await common.createComponent('one', 'botengine', user);
    await ReviewService.saveReview('component', component.id, user, '3', 'test');
    const value = await ReviewService.deleteReview('component', component.id, user.id, admin);
    expect(value.deletedCount).toBe(1);
    await expect(
      ReviewService.deleteReview('component', component.id, user.id, admin)
    ).rejects.toThrowError(ReviewNotFoundError);
  });

  it('should throw a "forbidden review" error when a user is not an administrator', async () => {
    const user = await common.createAndVerifyJohnDoe();
    const component = await common.createComponent('one', 'botengine', user);
    const result = await ReviewService.saveReview('component', component.id, user, '3', 'test');
    await expect(
      ReviewService.deleteReview(result.review.instanceType, result.review.instanceId, user.id, user)
      ).rejects.toThrowError(ForbiddenReviewError);
  });
});
