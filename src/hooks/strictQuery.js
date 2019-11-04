const { skippable, checkContext } = require('../lib');

const isObject = val => val !== null && val.constructor === Object;

const parseObject = (obj, types, parser) => {
  return Object.keys(obj).reduce((result, key) => {
    result[key] = parser(obj[key], types, parser);
    return result;
  }, {});
};

const isArray = val => Array.isArray(val);

const parseArray = (arr, types, parser) => {
  return arr.map(val => parser(val, types, parser));
};

const isStringNumber = val => !isNaN(parseFloat(val)) && isFinite(val);

const parseNumber = val => Number(val);

const isNumber = val => typeof val === 'number';

const stringifyNumber = val => val.toString();

const isStringNull = val => val === 'null';

const parseNull = () => null;

const isNull = val => val === null;

const stringifyNull = () => 'null';

const isStringBoolean = val => val === 'false' || val === 'true';

const parseBoolean = val => val === 'true';

const isBoolean = val => typeof val === 'boolean';

const stringifyBoolean = val => val.toString();

const parse = (val, types, parser) => {
  if (isObject(val)) {
    return parseObject(val, types, parser);
  } else if (isArray(val)) {
    return parseArray(val, types, parser);
  } else if (types.includes('null') && isStringNull(val)) {
    return parseNull();
  } else if (types.includes('boolean') && isStringBoolean(val)) {
    return parseBoolean(val);
  } else if (types.includes('number') && isStringNumber(val)) {
    return parseNumber(val);
  } else {
    return val;
  }
};

const stringify = (val, types, parser) => {
  if (isObject(val)) {
    return parseObject(val, types, parser);
  } else if (isArray(val)) {
    return parseArray(val, types, parser);
  } else if (types.includes('null') && isNull(val)) {
    return stringifyNull();
  } else if (types.includes('boolean') && isBoolean(val)) {
    return stringifyBoolean(val);
  } else if (types.includes('number') && isNumber(val)) {
    return stringifyNumber(val);
  } else {
    return val;
  }
};

const clientProvider = context => {
  if (context.app.io !== undefined) {
    return 'socketio';
  } else if (context.app.primus !== undefined) {
    return 'primus';
  } else if (context.app.rest !== undefined) {
    return 'rest';
  } else {
    return undefined;
  }
};

// The server side hook. This hook should be attached to
// app.hooks.before.all to ensure the query is parsed before
// all other hooks.
const strictQueryParse = (
  options = {
    types: ['boolean', 'number', 'null'],
    providers: ['rest']
  }
) => {
  return skippable('strictQueryParse', context => {
    checkContext(context, 'before', null, 'strictQueryParse');
    const { types, providers } = Object.assign(
      {},
      options,
      context.params.strictQueryParse || {}
    );
    if (!context.params.query || !providers.includes(context.params.provider)) {
      return context;
    }
    context.params.query = parseObject(context.params.query, types, parse);
    return context;
  });
};
module.exports.strictQueryParse = strictQueryParse;

// The client side hook. This hook should be the last hook called
// in any given hook chain. See the plugin below
const strictQueryStringify = (
  options = {
    types: ['null'],
    providers: ['rest']
  }
) => {
  return skippable('strictQueryStringify', context => {
    checkContext(context, 'before', null, 'strictQueryParse');
    const { types, providers } = Object.assign(
      {},
      options,
      context.params.strictQueryStringify || {}
    );
    const provider = clientProvider(context.app);
    if (!context.params.query || !providers.includes(provider)) {
      return context;
    }
    context.params.query = parseObject(context.params.query, types, stringify);
    return context;
  });
};
module.exports.strictQueryStringify = strictQueryStringify;

// A convenience to add the client side hook to all service
// methods as the last hook w/o relying on the developer to
// handle placing it last on all methods/services manually.
// This plugin should be called after all services have been
// setup. Note that calling service.hooks() again after this
// will cause the strictQueryStringify to no longer be last
module.exports.strictQueryClient = app => {
  Object.values(app.services).forEach(service => {
    service.hooks({
      before: {
        find: [strictQueryStringify()],
        get: [strictQueryStringify()],
        create: [strictQueryStringify()],
        update: [strictQueryStringify()],
        patch: [strictQueryStringify()],
        remove: [strictQueryStringify()]
      }
    });
  });
};

// A convenience to add the client server side hook
// as the first hook in app.hooks. Should be called
// before any other app.hooks()
module.exports.strictQueryServer = app => {
  app.hooks({ before: { all: [strictQueryParse()] } });
};
