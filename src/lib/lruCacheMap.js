const LruCache = require('lru-cache');

LruCache.prototype.delete = LruCache.prototype.del;
LruCache.prototype.clear = LruCache.prototype.reset;

module.exports = LruCache;
