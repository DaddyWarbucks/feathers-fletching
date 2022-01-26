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

const isObject = obj => {
  return obj && typeof maybeObj === 'object' && !Array.isArray(obj);
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

const traverse = (obj, callback) => {
  Object.entries(obj).forEach(([rootKey, rootVal]) => {
    if (Array.isArray(rootVal)) {
      rootVal.forEach(childVal => traverse(childVal, callback));
    }
    if (isObject(rootVal)) {
      traverse(rootVal, callback);
    }
    return callback(obj, [rootKey, rootVal]);
  });

  return obj;
};

module.exports.traverse = traverse;

const asyncTraverse = async (obj, callback) => {
  await Promise.all(
    Object.entries(obj).map(async ([rootKey, rootVal]) => {
      if (Array.isArray(rootVal)) {
        await Promise.all(
          rootVal.map(childVal => asyncTraverse(childVal, callback))
        );
      }
      if (isObject(rootVal)) {
        await asyncTraverse(rootVal, callback);
      }
      return callback(obj, [rootKey, rootVal]);
    })
  );

  return obj;
};

module.exports.asyncTraverse = asyncTraverse;

// https://github.com/angus-c/just/blob/master/packages/collection-clone/index.js
const clone = obj => {
  if (typeof obj == 'function') {
    return obj;
  }
  var result = Array.isArray(obj) ? [] : {};
  for (var key in obj) {
    // include prototype properties
    var value = obj[key];
    var type = {}.toString.call(value).slice(8, -1);
    if (type == 'Array' || type == 'Object') {
      result[key] = clone(value);
    } else if (type == 'Date') {
      result[key] = new Date(value.getTime());
    } else if (type == 'RegExp') {
      result[key] = RegExp(value.source, getRegExpFlags(value));
    } else {
      result[key] = value;
    }
  }
  return result;
};

module.exports.clone = clone;

const getRegExpFlags = regExp => {
  if (typeof regExp.source.flags == 'string') {
    return regExp.source.flags;
  } else {
    var flags = [];
    regExp.global && flags.push('g');
    regExp.ignoreCase && flags.push('i');
    regExp.multiline && flags.push('m');
    regExp.sticky && flags.push('y');
    regExp.unicode && flags.push('u');
    return flags.join('');
  }
};
