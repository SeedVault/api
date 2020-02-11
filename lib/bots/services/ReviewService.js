const ValidationError = require('mongoose/lib/error/validation');
const { Review } = require('../entities/Review');
const { ComponentService } = require('./ComponentService');
const { BotService } = require('./BotService');

class InstanceNotFoundError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InstanceNotFoundError';
    this.errors['_'] = { message: 'domain.review.validation.instance_not_found' };
  }
}

class InvalidInstanceTypeError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidInstanceTypeError';
    this.errors['_'] = { message: 'domain.review.validation.invalid_instance_type' };
  }
}

class ReviewNotFoundError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ReviewNotFoundError';
    this.errors['_'] = { message: 'domain.review.validation.review_not_found' };
  }
}

class ForbiddenReviewError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenComponentError';
    this.errors['_'] = { message: 'domain.component.validation.forbidden_review' };
  }
}

const ReviewService = {

  findInstance: async (instanceType, instanceId) => {
    try {
      let instance = null;
      switch(instanceType) {
        case 'component':
          instance = await ComponentService.findComponentById(instanceId);
          break;
        case 'bot':
          instance = await BotService.findBotById(instanceId);
          break;
        default:
          throw new InvalidInstanceTypeError('');
      }
      return instance;
    } catch (err) {
      if (err instanceof InvalidInstanceTypeError) {
        throw err;
      } else {
        throw new InstanceNotFoundError();
      }
    }
  },

  saveReview: async (instanceType, instanceId, user, rating, comments) => {
    const instance = await ReviewService.findInstance(instanceType, instanceId); // Validate instance
    let review = await ReviewService.findReview(instanceType, instanceId, user.id);
    if (review === null) {
      review = new Review({
        instanceType,
        instanceId,
        user: user.id,
      })
    }
    review.rating = rating;
    review.comments = comments;
    const savedReview = await review.save();
    await instance.updateRating();
    const result = {
      review: savedReview,
      reviewsCount: instance.reviewsCount,
      averageRating: instance.averageRating,
    }
    return result;
  },

  findReview: async (instanceType, instanceId, userId) => {
    return await Review.findOne({
      instanceType: instanceType,
      instanceId: instanceId,
      user: userId,
    }).populate('user', 'username accountStatus').exec();
  },


  deleteReview: async (instanceType, instanceId, userId, user) => {
    const review = await ReviewService.findReview(instanceType, instanceId, userId);
    if (review === null) {
      throw new ReviewNotFoundError();
    }
    if (user.username.toLowerCase() !== process.env.VUE_APP_API_ADMIN_USERNAME.toLowerCase()) {
      throw new ForbiddenReviewError();
    }
    return await Review.deleteOne({_id: review._id});
  },


  findPaginatedReviews: async (resultsPerPage, currentPage, instanceType, instanceId) => {
    let query = {}
    let sorting = {}
    if (['component', 'bot'].includes(instanceType) === false) {
      throw new InvalidInstanceTypeError();
    }
    query['instanceType'] = instanceType;
    query['instanceId'] = instanceId;
    sorting['updatedAt'] = 'desc';
    const results = await Review
      .find(query)
      .populate({
        path: 'user',
        select: '_id username accountStatus',
      })
      .sort(sorting)
      .skip((resultsPerPage * currentPage) - resultsPerPage)
      .limit(resultsPerPage);
    const resultsCount = await Review.countDocuments(query);
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
  ReviewService,
  InstanceNotFoundError,
  InvalidInstanceTypeError,
  ReviewNotFoundError,
  ForbiddenReviewError,
}

