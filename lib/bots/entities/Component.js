var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
const { Review } = require('./Review');

const PropertySchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'validation.required'],
    match: [/^[a-zA-Z_$][a-zA-Z_\-$0-9]*$/, 'validation.regex'],
    trim: true,
  },
  valueType: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['fixed', 'developer', 'publisher'],
      message: 'validation.option'
    },
    trim: true,
    default: 'fixed'
  },
  inputType: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['select', 'text', 'textarea'],
      message: 'validation.option'
    },
    trim: true,
    default: 'text',
  },
  options: {  // options: ["Ms", "Mr", "Mx", "Dr", "Madam", "Lord"]
    type: String,
    trim: true,
  },
  required: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['yes', 'no'],
      message: 'validation.option'
    },
    trim: true,
    default: 'yes'
  },
  value: {
    type: String,
    trim: true
  },
  tooltip: {
    type: String,
    trim: true,
    default: ''
  },
});


const ComponentSchema = mongoose.Schema({
  componentType: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['botengine', 'service', 'channel'],
      message: 'validation.option'
    },
    trim: true,
    index: true,
  },
  category: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: [
        'coaching_and_training',
        'communication',
        'cryptocurrency',
        'customer_service',
        'design',
        'education',
        'entertainment',
        'events',
        'finance',
        'games',
        'general',
        'health_and_fitness',
        'healthcare',
        'marketing',
        'news',
        'personal',
        'security',
        'real_estate',
        'research',
        'retail',
        'support',
        'travel',
        'utilities',
        'weather',
      ],
      message: 'validation.option'
    },
    default: 'general',
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'validation.required'],
    index: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'validation.required'],
    trim: true
  },
  features: {
    type: String,
    required: [true, 'validation.required'],
    trim: true
  },
  license: {
    type: String,
    required: [true, 'validation.required'],
    trim: true
  },
  key: {
    type: String,
    required: [true, 'validation.required'],
    match: [/^[a-zA-Z_$][a-zA-Z_$0-9]*$/, 'validation.regex'],
    // match: [/^[^a-zA-Z_$]|[^\\w$]/, 'validation.regex'],
    index: true,
    unique: true,
    trim: true
  },
  functionName: {
    type: String,
    required: [true, 'validation.required'],
    match: [/^[a-zA-Z_$][a-zA-Z_$0-9]*$/, 'validation.regex'],
    trim: true
  },
  url: {
    type: String,
    // required: [true, 'validation.required'],
    trim: true
  },
  httpMethod: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['GET', 'POST'],
      message: 'validation.option'
    },
    trim: true,
    default: 'GET'
  },
  timeout: {
    type: Number,
    min: [0, 'validation.option'],
    max: [9999, 'validation.option'],
    required: [true, 'validation.required'],
    default: 30,
  },
  pricingModel: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['free', 'pay_per_use', 'pay_per_month', 'pay_per_use_or_month'],
      message: 'validation.option'
    },
    trim: true,
    index: true,
    default: 'free'
  },
  pricePerUse: {
    type: Number,
    min: [0, 'validation.option'],
    max: [9999, 'validation.option'],
    required: [true, 'validation.required'],
    default: 0,
    index: true
  },
  pricePerMonth: {
    type: Number,
    min: [0, 'validation.option'],
    max: [9999, 'validation.option'],
    required: [true, 'validation.required'],
    default: 0,
    index: true
  },
  status: {
    type: String,
    required: [true, 'validation.required'],
    enum:  {
      values: ['enabled', 'disabled'],
      message: 'validation.option'
    },
    trim: true,
    index: true,
  },
  picture: {
    type: String,
    trim: true,
    default: '',
  },
  /* username: {
    type: String,
    required: [true, 'validation.required'],
    match: [/^[a-zA-Z0-9]+$/, 'validation.regex'],
    index: true,
    trim: true
  }, */
  averageRating: {
    type: Number,
    default: 0,
    index: true
  },
  reviewsCount: {
    type: Number,
    default: 0,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: [true, 'validation.required'],
  },
  properties: {
    type: [ PropertySchema ],
  },
  headers: {
    type: [ PropertySchema ],
  },
  predefinedVars: {
    type: [ PropertySchema ],
  },
  mappedVars: {
    type: [ PropertySchema ],
  },
}, {timestamps: true});

ComponentSchema.set('toJSON', { getters: true, virtuals: true });
ComponentSchema.set('toObject', { getters: true, virtuals: true });

ComponentSchema.plugin(uniqueValidator, { message: 'domain.component.validation.unique_{PATH}' });

ComponentSchema.pre('validate', function(next) {
  switch (this.pricingModel) {
    case 'free':
      this.pricePerUse = '0';
      this.pricePerMonth = '0';
      break;
    case 'pay_per_use':
      this.pricePerMonth = '0';
      break;
    case 'pay_per_month':
      this.pricePerUse = '0';
      break;
    default:
      // do nothing
  }
  next();
});

ComponentSchema.virtual('pictureUrl').get(function () {
  if (this.picture === '') {
    return `${process.env.VUE_APP_GREENHOUSE_URL}/images/component-default.png`;
  } else {
    return `${process.env.VUE_APP_CDN_URL}/greenhouse-components/${this.picture}`;
  }
});

ComponentSchema.methods.updateRating = async function() {
  const results = await Review.aggregate([
    { '$match': { instanceType: 'component', instanceId: this._id }},
    { '$group': {
      _id: null,
      reviewsCount: { '$sum': 1 },
      averageRating: { '$avg': '$rating' },
      }
    }
  ]).exec();
  this.reviewsCount = results[0].reviewsCount;
  this.averageRating = results[0].averageRating;
  return await this.save();
};

module.exports = {
  PropertySchema,
  Component: mongoose.model('Components', ComponentSchema)
}
