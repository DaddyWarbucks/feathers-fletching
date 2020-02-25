const assert = require('assert');
const contextCache = require('../../src/hooks/contextCache');

describe('contextCache', () => {
  const result1 = { id: 1, title: 'The Man in Black' };

  it('Returns from the cache in before hook', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: { query: { name: 'Johnny Cash' } }
    };

    const cacheMap = new Map();

    const key = JSON.stringify({
      method: context.method,
      query: context.params.query
    });

    cacheMap.set(key, result1);

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get(key), newContext.result);
  });

  it('Caches result in after hook', async () => {
    const context = {
      type: 'after',
      method: 'find',
      params: { query: { name: 'Johnny Cash' } },
      result: result1
    };

    const cacheMap = new Map();

    const key = JSON.stringify({
      method: context.method,
      query: context.params.query
    });

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get(key), newContext.result);
  });

  it('Can use a custom makeCacheKey option', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: { query: { name: 'Johnny Cash' } }
    };

    const cacheMap = new Map();

    const makeCacheKey = context => {
      return JSON.stringify({ method: context.method });
    };

    const key = makeCacheKey(context);

    const newContext = await contextCache(cacheMap, { makeCacheKey })(context);

    await assert.deepEqual(cacheMap.get(key), newContext.result);
  });

  it('Can use a custom clone option', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: { query: { name: 'Johnny Cash' } }
    };

    const cacheMap = new Map();

    const key = JSON.stringify({
      method: context.method,
      query: context.params.query
    });

    cacheMap.set(key, 42);

    const clone = context => 42;

    const newContext = await contextCache(cacheMap, { clone })(context);

    await assert.deepEqual(cacheMap.get(key), 42);
  });
});
