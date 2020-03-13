module.exports.omit = (obj, ...keys) => {
  const result = Object.assign({}, obj);
  keys.forEach(key => delete result[key]);
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
