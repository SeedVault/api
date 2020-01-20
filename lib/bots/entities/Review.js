var mongoose = require('mongoose');

const ReviewSchema = mongoose.Schema({
  instanceType: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['component', 'bot'],
      message: 'validation.option'
    },
    trim: true,
    default: 'fixed'
  },
  instanceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'validation.required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: [true, 'validation.required'],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'validation.required'],
    default: 0,
    validate : {
      validator : Number.isInteger,
      message   : 'validation.option'
    },
    index: true
  },
  comments: {
    type: String,
    required: [true, 'validation.required'],
    trim: true,
  },
}, {timestamps: true});

module.exports = {
  ReviewSchema,
  Review: mongoose.model('Reviews', ReviewSchema)
}
