const { skippable } = require('../lib');

const defaultMakeCacheKey = context => {
  return JSON.stringify({
    method: context.method,
    id: context.id,
    query: context.params.query
  });
};

const defaultClone = context => JSON.parse(JSON.stringify(context.result));

module.exports = (cacheMap, options = {}) => {
  const makeCacheKey = options.makeCacheKey || defaultMakeCacheKey;
  const clone = options.clone || defaultClone;
  return skippable('contextCache', async context => {
    const key = await makeCacheKey(context);
    if (context.type === 'before') {
      const value = await cacheMap.get(key);
      if (value) {
        context.result = value;
      }
    } else {
      const cloned = await clone(context);
      await cacheMap.set(key, cloned);
    }
    return context;
  });
};
