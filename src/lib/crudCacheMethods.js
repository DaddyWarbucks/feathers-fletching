const LruCache = require('./lruCacheMap');

module.exports = map => {
  return {
    get: (key, context) => {
      const { query = {} } = context.params || {};
      if (!Object.keys(query).length) {
        return map.get(key, context);
      }
    },
    set: (key, result, context) => {
      const { query = {} } = context.params || {};
      if (!query.$select) {
        if (map instanceof LruCache) {
          // LRU set() takes a third argument maxAge and
          // blows up if trying to pass it context
          return map.set(key, result);
        } else {
          return map.set(key, result, context);
        }
      }
    },
    delete: (key, context) => {
      return map.delete(key, context);
    },
    clear: context => {
      return map.clear(context);
    }
  };
};
