const assert = require('assert');
const contextCache = require('../../src/hooks/contextCache');

const makeKey = context => {
  return JSON.stringify({
    method: context.method,
    id: context.id,
    query: context.params.query
  });
};

function CacheMap() {
  const map = new Map();
  return {
    map,
    set: context => {
      const result = context.result;
      return map.set(makeKey(context), result);
    },
    get: context => {
      return map.get(makeKey(context));
    },
    clear: context => {
      return map.clear(context);
    }
  };
}

describe('contextCache', () => {
  const result1 = { id: 1, title: 'The Man in Black' };

  it('Returns from the cache in before hook', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: {}
    };

    const cacheMap = new CacheMap();

    cacheMap.set(context, result1);

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get(context), newContext.result);
  });

  it('Caches result in after hook', async () => {
    const context = {
      type: 'after',
      method: 'find',
      params: {},
      result: result1
    };

    const cacheMap = new CacheMap();

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get(context), result1);
  });

  it('Destroys the cache after mutation', async () => {
    const context = {
      type: 'after',
      method: 'create',
      params: {}
    };

    const cacheMap = new CacheMap();
    cacheMap.set(context);

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(Object.keys(cacheMap.map).length, 0);
  });
});
