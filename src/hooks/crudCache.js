const { skippable, getItems } = require('../lib');

const defaultClone = obj => JSON.parse(JSON.stringify(obj));

const defaultMakeCacheKey = (key, context) => {
  return key.toString ? key.toString() : key;
};

const defaultGetResultKey = (result, context) => {
  const keyField = (context.service || {}).id || 'id';
  return result[keyField];
};

module.exports = function(cacheMap, options = {}) {
  const clone = options.clone || defaultClone;
  const makeCacheKey = options.makeCacheKey || defaultMakeCacheKey;
  const getResultKey = options.getResultKey || defaultGetResultKey;

  return skippable('crudCache', async context => {
    const { query = {} } = context.params || {};
    if (context.type === 'before') {
      if (context.method === 'get' && !Object.keys(query).length) {
        const key = await makeCacheKey(context.id, context);
        const value = await cacheMap.get(key, context);
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
            return cacheMap.delete(key, cloned, context);
          })
        );
        return context;
      } else {
        if (!query.$select) {
          await Promise.all(
            results.map(async result => {
              const resultKey = await getResultKey(result, context);
              const key = await makeCacheKey(resultKey, context);
              const cloned = await clone(result, context);
              return cacheMap.set(key, cloned, context);
            })
          );
        }
        return context;
      }
    }
  });
};
