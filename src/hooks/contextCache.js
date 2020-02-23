const { skippable, getItems } = require('../lib');

const defaultClone = obj => JSON.parse(JSON.stringify(obj));

const defaultMakeCacheKey = key => {
  return key.toString ? key.toString() : key;
};

const defaultIsFiltering = context => {
  const { query = {} } = context.params;
  return !!query.$select;
};

const defaultIsQuerying = context => {
  const { query = {} } = context.params;
  return !!Object.keys(query).length;
};

const getIdName = (keyField, item) => {
  if (keyField) {
    return keyField;
  }
  return '_id' in item ? '_id' : 'id';
};

module.exports = function(cacheMap, keyFieldName, options = {}) {
  const clone = options.clone || defaultClone;
  const makeCacheKey = options.makeCacheKey || defaultMakeCacheKey;
  const isFiltering = options.isFiltering || defaultIsFiltering;
  const isQuerying = options.isQuerying || defaultIsQuerying;

  return skippable('contextCache', async context => {
    const keyField = keyFieldName || (context.service || {}).id;
    const items = getItems(context);
    const results = Array.isArray(items) ? items : [items];

    if (context.type === 'before') {
      switch (context.method) {
        case 'find': {
          return context;
        }
        case 'create': {
          return context;
        }
        case 'get': {
          if (!isQuerying(context)) {
            const key = makeCacheKey(context.id);
            const value = await cacheMap.get(key);
            if (value) {
              context.result = value;
            }
          }
          return context;
        }
        default: {
          // update, patch, remove
          if (context.id) {
            const key = makeCacheKey(context.id);
            await cacheMap.delete(key);
          } else {
            await Promise.all(
              results.map(result => {
                const idName = getIdName(keyField, result);
                const key = makeCacheKey(result[idName]);
                return cacheMap.delete(key, clone(result));
              })
            );
          }
          return context;
        }
      }
    } else {
      switch (context.method) {
        case 'remove': {
          return context;
        }
        default: {
          // find, get, create, update, patch
          if (!isFiltering(context)) {
            await Promise.all(
              results.map(result => {
                const idName = getIdName(keyField, result);
                const key = makeCacheKey(result[idName]);
                return cacheMap.set(key, clone(result));
              })
            );
          }
          return context;
        }
      }

      return context;
    }
  });
};
