const LruCache = require('./lruCacheMap');
const crudCacheMethods = require('./crudCacheMethods');

module.exports = function(opts) {
  return crudCacheMethods(new LruCache(opts));
};
