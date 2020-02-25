const LruCache = require('lru-cache');
const crudCacheMethods = require('./crudCacheMethods');

LruCache.prototype.delete = LruCache.prototype.del;
LruCache.prototype.clear = LruCache.prototype.reset;

module.exports = function(opts) {
  return crudCacheMethods(new LruCache(opts));
};
