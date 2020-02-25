const LruCache = require('./lruCache');
const crudCacheMethods = require('./crudCacheMethods');

module.exports = function(opts) {
  return crudCacheMethods(new LruCache(opts));
};
