const { skippable } = require('../lib');

module.exports = cacheMap => {
  return skippable('contextCache', async context => {
    if (context.type === 'before') {
      if (context.method === 'get' || context.method === 'find') {
        const value = await cacheMap.get(context);
        if (value) {
          context.result = value;
        }
      }
    } else {
      if (context.method === 'get' || context.method === 'find') {
        await cacheMap.set(context);
      } else {
        await cacheMap.clear(context);
      }
    }
    return context;
  });
};
