const { skippable, checkContext } = require('../lib');

const jsonQueryStringify = skippable(
  'jsonQueryStringify',
  (
    options = {
      overwrite: true,
      propName: 'json'
    }
  ) => {
    return context => {
      checkContext(context, 'before', null, 'jsonQueryStringify');
      const { query } = context.params;
      if (!query) {
        return context;
      }
      const { overwrite, propName } = Object.assign(
        {},
        options,
        context.params.jsonQueryStringify || {}
      );
      if (overwrite) {
        context.params.query = { [propName]: JSON.stringify(query) };
      } else {
        context.params.query[propName] = JSON.stringify(query);
      }
      return context;
    };
  }
);
module.exports.jsonQueryStringify = jsonQueryStringify;

const jsonQueryParse = skippable(
  'jsonQueryParse',
  (
    options = {
      overwrite: true,
      propName: 'json'
    }
  ) => {
    return context => {
      checkContext(context, 'before', null, 'jsonQueryParse');
      const { query } = context.params;
      if (!query) {
        return context;
      }
      const { overwrite, propName } = Object.assign(
        {},
        options,
        context.params.jsonQueryParse
      );
      if (overwrite) {
        context.params.query = JSON.parse(query[propName]);
      } else {
        context.params.query[propName] = JSON.parse(query[propName]);
      }
      return context;
    };
  }
);
module.exports.jsonQueryParse = jsonQueryParse;

// A convenience to add the client side hook to all service
// methods as the last hook w/o relying on the developer to
// handle placing it last on all methods/services manually.
// This plugin should be called after all services have been
// setup. Note that calling service.hooks() again after this
// will cause the jsonQueryStringify to no longer be last
module.exports.jsonQueryClient = app => {
  Object.values(app.services).forEach(service => {
    service.hooks({
      before: {
        find: [jsonQueryStringify()],
        get: [jsonQueryStringify()],
        create: [jsonQueryStringify()],
        update: [jsonQueryStringify()],
        patch: [jsonQueryStringify()],
        remove: [jsonQueryStringify()]
      }
    });
  });
};

// A convenience to add the server side hook
// as the first hook in app.hooks. Should be called
// before any other app.hooks()
module.exports.jsonQueryServer = app => {
  app.hooks({ before: { all: [jsonQueryParse()] } });
};
