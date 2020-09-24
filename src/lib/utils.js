const unset = require('unset-value');

module.exports.omit = (obj, keys) => {
  const result = Object.assign({}, obj);
  keys.forEach(key => unset(result, key));
  return result;
};

module.exports.pick = (obj, ...keys) => {
  return keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }

    return result;
  }, {});
};

module.exports.isPromise = maybePromise => {
  const isPromise = maybePromise && typeof maybePromise.then === 'function';
  return !!isPromise;
};

const isObject = maybeObj => {
  return maybeObj && typeof maybeObj === 'object' && !Array.isArray(maybeObj);
};

module.exports.isObject = isObject;

module.exports.hasQuery = context => {
  const hasQuery =
    context.params &&
    context.params.query &&
    Object.keys(context.params.query).length;

  return !!hasQuery;
};

module.exports.getResults = context => {
  return context.method === 'find'
    ? context.result.data || context.result
    : context.result;
};

module.exports.replaceResults = (context, results) => {
  if (context.method === 'find') {
    if (context.result && context.result.data) {
      context.result.data = Array.isArray(results) ? results : [results];
    } else {
      context.result = Array.isArray(results) ? results : [results];
    }
  } else {
    context.result = results;
  }
};

module.exports.stableStringify = obj => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') {
      throw new Error('Cannot stringify non JSON value');
    }

    if (isObject(value)) {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = value[key];
          return result;
        }, {});
    }

    return value;
  });
};

module.exports.insertHook = (hooks, path, hook) => {
  const [type, method, position] = path.split('.');

  console.log(type, method, position);
  const index = Number(position);

  hooks[type] = hooks[type] || {};
  hooks[type][method] = hooks[type][method] || [];

  if (index === -1) {
    hooks[type][method].push(hook);
    return hooks;
  }

  hooks[type][method].splice(index, 0, hook);
  return hooks;
};
