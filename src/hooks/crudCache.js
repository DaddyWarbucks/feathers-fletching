const { skippable, getItems } = require('../lib');

const defaultClone = obj => JSON.parse(JSON.stringify(obj));

const defaultMakeCacheKey = (key, context) => {
  return key.toString ? key.toString() : key;
};

const defaultIsFiltering = context => {
  const { query = {} } = context.params || {};
  return !!query.$select;
};

const defaultIsQuerying = context => {
  const { query = {} } = context.params || {};
  return !!Object.keys(query).length;
};

const defaultGetResultKey = (result, context) => {
  const keyField = (context.service || {}).id || 'id';
  return result[keyField];
};

module.exports = function(cacheMap, options = {}) {
  const clone = options.clone || defaultClone;
  const makeCacheKey = options.makeCacheKey || defaultMakeCacheKey;
  const getResultKey = options.getResultKey || defaultGetResultKey;
  const isFiltering = options.isFiltering || defaultIsFiltering;
  const isQuerying = options.isQuerying || defaultIsQuerying;

  return skippable('crudCache', async context => {
    if (context.type === 'before') {
      const querying = await isQuerying(context);
      if (context.method === 'get' && !querying) {
        const key = await makeCacheKey(context.id, context);
        const value = await cacheMap.get(key);
        if (value) {
          context.result = value;
        }
      }
      return context;
    } else {
      const items = getItems(context);
      const results = Array.isArray(items) ? items : [items];
      if (context.method === 'remove') {
        await Promise.all(
          results.map(async result => {
            const resultKey = await getResultKey(result, context);
            const key = await makeCacheKey(resultKey, context);
            const cloned = await clone(result, context);
            return cacheMap.delete(key, cloned);
          })
        );
        return context;
      } else {
        const filtering = isFiltering(context);
        if (!filtering) {
          await Promise.all(
            results.map(async result => {
              const resultKey = await getResultKey(result, context);
              const key = await makeCacheKey(resultKey, context);
              const cloned = await clone(result, context);
              return cacheMap.set(key, cloned);
            })
          );
        }
        return context;
      }
    }
  });
};
