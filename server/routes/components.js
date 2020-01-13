var express = require('express');
var router = express.Router();
const ValidationError = require('mongoose/lib/error/validation');
const { ComponentService, ForbiddenComponentError } =
  require('../../lib/bots/services/ComponentService');
const { UserService } = require('../../lib/users/services/UserService');
const fs = require('fs');
const {resolve} = require("path");
var multer  = require('multer')
var storage = multer.diskStorage({
  destination: resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/greenhouse-components/`),
  filename: function (req, file, cb) {
    // cb(null, `${req.params.id}.jpg`);
    const timestamp = new Date().getTime().toString();
    cb(null, `${timestamp}.jpg`);
  }
})
const imageFilter = function (req, file, cb) {
  if (file.mimetype !== 'image/jpeg') {
    return cb(new Error('Only JPG image files are allowed'), false);
  }
  cb(null, true);
}
var upload = multer({ storage: storage, fileFilter: imageFilter });

module.exports = function (passport, csrfProtection) {

  /**
   * POST /v1/components/save
   */
  router.post('/save', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const data = req.body.component;
        // Strip field "_id" off from inner collections
        const collections = ['properties', 'headers', 'predefinedVars', 'mappedVars'];
        for (let i = 0; i < collections.length; i++) {
          let c = collections[i];
          if (typeof(data[c]) !== 'undefined') {
            for (let j = 0; j < data[c].length; j++) {
              if (data[c][j]._id === '') {
                delete data[c][j]._id;
              }
            }
          }
        }
        let component = {};
        let id = data.id || '';
        if (id === '') {
          component.user = await UserService.findMyUserById(req.user.username, req.user.id);
        } else {
          component = await ComponentService.findComponentById(id, req.user.id);
        }
        component.componentType = data.componentType;
        component.category = data.category;
        component.name = data.name;
        component.description = data.description;
        component.features = data.features;
        component.license = data.license;
        component.key = data.key,
        component.functionName = data.functionName;
        component.url = data.url;
        component.httpMethod = data.httpMethod;
        component.timeout = data.timeout;
        component.pricingModel = data.pricingModel;
        component.pricePerUse = data.pricePerUse;
        component.pricePerMonth = data.pricePerMonth;
        component.status = data.status;
        component.properties = data.properties;
        component.headers = data.headers;
        component.predefinedVars = data.predefinedVars;
        component.mappedVars = data.mappedVars;
        if (id === '') {
          const result = await ComponentService.createComponent(component);
          id = result._id;
        } else {
          await ComponentService.updateComponent(component, req.user.id);
        }
        res.status(200).json({saved: true, id: id});
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(422).json(err);
        } else {
          return res.status(500).json(err);
        }
      }
    },
  );


  /**
   * POST /v1/components/:id/change-picture
   */
  router.post('/:id/change-picture', csrfProtection, upload.single('pictureFile'),
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const component = await ComponentService.findComponentById(req.params.id, req.user.id);
        const oldFile = resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/greenhouse-components/${component.picture}`)
        if (component.picture !== '') {
          if (fs.existsSync(oldFile)) {
            fs.unlink(oldFile, (err) => {
              if (err) {
                console.error(err)
                return
              }
            })
          }
        }
        component.picture = req.file.filename;
        const data = await ComponentService.updateComponent(component, req.user.id);
        res.status(200).json({ data });
      } catch (err) {
        if (err instanceof ForbiddenComponentError) {
          return res.status(403).json(err);
        }
        if (err instanceof ValidationError) {
          return res.status(422).json(err);
        }
        return res.status(500).json(err);
      }
    }
  );

  /**
   * GET /v1/components/lookup
   */
  router.get('/lookup', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const components = await ComponentService.findComponentsWithIdInArray(req.query.ids.split(','));
        let filteredComponents = [];
        for (let i = 0; i < components.length; i++) {
          const c = components[i];
          filteredComponents.push({
            _id: c._id,
            name: c.name,
            pictureUrl: c.pictureUrl,
          });
        }
        res.status(200).json(filteredComponents);
      } catch (err) {
        if (err instanceof ForbiddenComponentError) {
          return res.status(403).json(err);
        }
        if (err instanceof ValidationError) {
          return res.status(422).json(err);
        }
        return res.status(500).json(err);
      }
    },
  );


  /**
   * GET /v1/components/:id
   */
  router.get('/:id', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const component = await ComponentService.findComponentById(req.params.id);
        res.status(200).json(component);
      } catch (err) {
        if (err instanceof ForbiddenComponentError) {
          return res.status(403).json(err);
        }
        if (err instanceof ValidationError) {
          return res.status(422).json(err);
        }
        return res.status(500).json(err);
      }
    },
  );


  /**
   * GET /v1/components/:id/delete
   */
  router.delete('/:id/delete', csrfProtection,
    async function (req, res) {
      if (!req.user) {
        return res.status(403).json('Forbidden');
      }
      try {
        const component = await ComponentService.findComponentById(req.params.id, req.user.id);
        const oldFile = resolve(`${__dirname}/../../../cdn/${process.env.NODE_ENV}/greenhouse-components/${component.picture}`)
        if (component.picture !== '') {
          if (fs.existsSync(oldFile)) {
            fs.unlink(oldFile, (err) => {
              if (err) {
                console.error(err)
                return
              }
            })
          }
        }
        const data = await ComponentService.deleteComponentById(req.params.id, req.user.id);
        return res.status(200).json(data);
      } catch (err) {
        if (err instanceof ForbiddenComponentError) {
          return res.status(403).json(err);
        }
        if (err instanceof ValidationError) {
          return res.status(422).json(err);
        }
        return res.status(500).json(err);
      }
    },
  );


  async function getPropertiesForValueType(req, res, valueType) {
    if (!req.user) {
      return res.status(403).json('Forbidden');
    }
    try {
      const data = await ComponentService.getPropertiesForValueType(
        req.params.id,
        valueType,
      );
      res.status(200).json(data);
    } catch (err) {
      if (err instanceof ForbiddenComponentError) {
        return res.status(403).json(err);
      }
      if (err instanceof ValidationError) {
        return res.status(422).json(err);
      }
      return res.status(500).json(err);
    }
  }

  /**
   * GET /v1/components/:id/properties/developer
   */
  router.get('/:id/properties/developer', csrfProtection,
    async function (req, res) {
      return await getPropertiesForValueType(req, res, 'developer');
    },
  );


  /**
   * GET /v1/components/:id/properties/publisher
   */
  router.get('/:id/properties/publisher', csrfProtection,
    async function (req, res) {
      return await getPropertiesForValueType(req, res, 'publisher');
    },
  );


  async function getPaginatedResults(req, res, screen, componentType) {
    if (!req.user) {
      return res.status(403).json('Forbidden');
    }
    try {
      let userId = '';
      if (screen === 'users') {
        const user = await UserService.findUserByUsername(req.params.username);
        userId = user.id;
      }
      const resultsPerPage = 10;
      const page = req.query.page || 1;
      const search = req.query.search || '';
      if (typeof componentType === 'undefined') {
        componentType = ['botengine', 'channel'];
      }
      if (req.serviceOnly) {
        componentType = 'service';
      }
      let status = req.query.status || '';
      let sortBy = req.query.sortBy || '';
      let sortType = req.query.sortType || 'asc';
      let category = req.query.category || '';
      const data = await ComponentService.findPaginatedComponents(
        resultsPerPage,
        page,
        userId,
        search,
        componentType,
        status,
        sortBy,
        sortType,
        category
      );
      res.status(200).json(data);
    } catch (err) {
      if (err instanceof ForbiddenComponentError) {
        return res.status(403).json(err);
      }
      if (err instanceof ValidationError) {
        return res.status(422).json(err);
      }
      return res.status(500).json(err);
    }
  }


  /**
   * GET /v1/components/user/:username
   */
  router.get('/user/:username', csrfProtection,
    async function (req, res) {
      return await getPaginatedResults(req, res, 'users');
    },
  );


  /**
   * GET /v1/components/
   */
  router.get('/', csrfProtection,
    async function (req, res) {
      return await getPaginatedResults(req, res, 'marketplace');
    },
  );


  /**
   * GET /v1/components/type/:componentType
   */
  router.get('/type/:componentType', csrfProtection,
    async function (req, res) {
      return await getPaginatedResults(req, res, 'marketplace', req.params.componentType);
    },
  );


  return router;

};
