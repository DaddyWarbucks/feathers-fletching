const LRU = require('lru-cache');
const { omit } = require('../lib/utils');

LRU.prototype.delete = LRU.prototype.del;
LRU.prototype.clear = LRU.prototype.reset;

module.exports = class ContextCacheMap {
  constructor(options = {}) {
    const lruOptions = omit(options, 'id');
    this.id = options.id || 'id';
    this.map = new LRU(lruOptions);
    this.makeKey = this.makeKey.bind(this);
    this.clone = this.clone.bind(this);
    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.clear = this.clear.bind(this);
  }

  makeKey(context) {
    return JSON.stringify({
      method: context.method,
      id: context.id,
      query: context.params && context.params.query
    });
  }

  clone(context) {
    return JSON.parse(JSON.stringify(context.result));
  }

  // Called before get() and find()
  async get(context) {
    const key = this.makeKey(context);
    return this.map.get(key);
  }

  // Called create(), update(), and patch()
  async set(context) {
    const key = this.makeKey(context);
    const result = this.clone(context);
    return this.map.set(key, result);
  }

  // Called after remove()
  async clear(context) {
    const result = context.result;
    const results = Array.isArray(result) ? result : [result];
    results.forEach(result => {
      Array.from(this.map.keys()).forEach(key => {
        const keyObj = JSON.parse(key);
        if (keyObj.method === 'find') {
          // This is a cached `find` request. Any create/patch/update/del
          // could affect the results of this query so it should be deleted
          return this.map.delete(key);
        } else {
          // This is a cached `get` request
          if (context.method !== 'create') {
            // If not creating, there may be a cached get for this id
            // Use toString() to be compatibile with mongo/mongoose ObjectID
            if (keyObj.id.toString() === result[this.id].toString()) {
              // Delete all `gets` that have this id
              return this.map.delete(key);
            }
          }
        }
      });
    });
  }
};
