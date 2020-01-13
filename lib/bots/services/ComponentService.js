const ValidationError = require('mongoose/lib/error/validation');
const { Component } = require('../entities/Component');

class ComponentNotFoundError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ComponentNotFoundError';
    this.errors['_'] = { message: 'domain.component.validation.component_not_found' };
  }
}

class ForbiddenComponentError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenComponentError';
    this.errors['_'] = { message: 'domain.component.validation.forbidden_component' };
  }
}

const ComponentService = {

  createComponent: async (data) => {
    let component = new Component(data);
    return await component.save();
  },

  updateComponent: async (component, userId) => {
    await ComponentService.findComponentById(component._id, userId);
    return await component.save();
  },

  /* removeVirtualsFromUser: (raw) => {
    let component = raw.toObject();
    delete component.user.fullname;
    delete component.user.pictureUrl;
    return component;
  }, */

  findComponentById: async (id, userId) => {
    let component = await Component.findById(id).populate('user', 'username accountStatus').exec();
    if (!component) {
      throw new ComponentNotFoundError();
    }
    if (typeof(userId) !== 'undefined') {
      if (component.user.id.toString() === userId.toString()) {
        return component;
      } else {
        throw new ForbiddenComponentError('');
      }
    }
    return component
  },

  deleteComponentById: async (id, userId) => {
    await ComponentService.findComponentById(id, userId);
    return await Component.deleteOne({_id: id});
  },

  getPropertiesForValueType: async (id, valueType) => {
    const component = await ComponentService.findComponentById(id);
    let data = {
      _id: component.id,
      name: component.name,
      pictureUrl: component.pictureUrl,
      pricingModel: component.pricingModel,
      pricePerUse: component.pricePerUse,
      pricePerMonth: component.pricePerMonth,
      status: component.status,
      properties: [],
      headers: [],
      predefinedVars: [],
      mappedVars: [],
    }
    let collections = ['properties'];
    if (component.componentType === 'service') {
      collections = ['properties', 'headers', 'predefinedVars', 'mappedVars'];
    }
    for (let i = 0; i < collections.length; i++) {
      let c = collections[i];
      if (typeof(component[c]) !== 'undefined') {
        for (let j = 0; j < component[c].length; j++) {
          if (component[c][j].valueType === valueType) {
            data[c].push(component[c][j]);
          }
        }
      }
    }
    return data;
  },

  findComponentsWithIdInArray: async (ids) => {
    return await Component.find().where('_id').in(ids).populate('user', 'username accountStatus').exec();
  },

  findPaginatedComponents: async (resultsPerPage, currentPage, userId, search, componentType, status, sortBy, sortType, category) => {
    let query = {}
    let sorting = {}
    // validation
    /* if (componentType !== 'botengine' && componentType !== 'service' && componentType !== 'channel') {
      componentType = '';
    } */
    if (status !== 'enabled' && status !== 'disabled') {
      status = '';
    }
    if (sortBy !== 'name' && sortBy !== 'updatedAt') {
      sortBy = '';
    }
    if (sortType !== 'asc' && sortType !== 'desc') {
      sortType = 'asc';
    }
    // filters
    if (userId !== '' ) {
      query['user'] = userId;
    }
    if (search !== '') {
      query['$and'] = [{ $or: [{name: { $regex:  `.*${search}.*`, $options: 'i' }}, {description: { $regex:  `.*${search}.*`, $options: 'i' }}] }];
    }
    if (Array.isArray(componentType)) {
      query['componentType'] = componentType;
    } else {
      if (componentType !== '' ) {
        query['componentType'] = componentType;
      }
    }
    if (status !== '' ) {
      query['status'] = status;
    }
    if (category !== '' ) {
      query['category'] = category;
    }
    if (sortBy !== '' ) {
      sorting[sortBy] = sortType;
    }
    const results = await Component
      .find(query)
      .select({
        "category": 1,
        "pricingModel": 1,
        "pricePerUse": 1,
        "pricePerMonth": 1,
        "picture": 1,
        "pictureUrl": 1,
        "user": 1,
        "name": 1,
        "description": 1,
        "features": 1,
        "license": 1,
        "status": 1,
        "createdAt": 1,
        "updatedAt": 1,
      })
      .populate({
        path: 'user',
        select: '_id username accountStatus',
      })
      .sort(sorting)
      .skip((resultsPerPage * currentPage) - resultsPerPage)
      .limit(resultsPerPage);
    const resultsCount = await Component.countDocuments(query);
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
  ComponentNotFoundError,
  ComponentService,
  ForbiddenComponentError,
}
