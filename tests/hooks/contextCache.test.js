const assert = require('assert');
const contextCache = require('../../src/hooks/contextCache');
const ContextCacheMap = require('../../src/lib/contextCacheMap');

describe('contextCache', () => {
  const result1 = { id: 1, title: 'Man in Black' };
  const result2 = { id: 2, title: 'I wont Back Down' };

  it('Returns from the cache in before hook', async () => {
    const context = {
      type: 'before',
      method: 'find'
    };

    const cacheMap = new ContextCacheMap();

    await cacheMap.set({
      method: 'find',
      result: result1
    });

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(result1, newContext.result);
  });

  it('Caches result in after hook', async () => {
    const context = {
      type: 'after',
      method: 'find',
      result: result1
    };

    const cacheMap = new ContextCacheMap();

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(await cacheMap.get(context), result1);
  });

  it('Destroys all cached find()s, but not get()s, on create', async () => {
    const context = {
      type: 'after',
      method: 'create',
      result: { id: 3, title: 'Life In Nashville' }
    };

    const cacheMap = new ContextCacheMap();

    // This should be cleared because create() clears all find()s
    await cacheMap.set({
      method: 'find',
      result: result1
    });

    // This should not be cleared because a create() does
    // not affect a get() to another ID
    await cacheMap.set({
      method: 'get',
      id: 1,
      result: result1
    });

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.map.keys().length, 1);
  });

  it('Destroys all cached find()s, and all relevant gets(), on mutate', async () => {
    const context = {
      type: 'after',
      method: 'update',
      result: { id: 1, title: 'Life In Nashville' }
    };

    const cacheMap = new ContextCacheMap();

    // This should be cleared bc it is a find()
    // and all mutations clear all find()s
    await cacheMap.set({
      method: 'find',
      result: result1
    });

    // This should be cleared bc its id matches the updated record id
    await cacheMap.set({
      method: 'get',
      id: 1,
      result: result1
    });

    // This should not be cleared bc its id DOESN'T match the updated record id
    await cacheMap.set({
      method: 'get',
      id: 2,
      result: result2
    });

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.map.keys().length, 1);
  });

  it('Destroys all cached find()s, and all relevant gets(), on remove', async () => {
    const context = {
      type: 'after',
      method: 'remove',
      result: { id: 1, title: 'Life In Nashville' }
    };

    const cacheMap = new ContextCacheMap();

    // This should be cleared bc it is a find()
    // and remove() clear all find()s
    await cacheMap.set({
      method: 'find',
      result: result1
    });

    // This should be cleared bc its id matches the removed record id
    await cacheMap.set({
      method: 'get',
      id: 1,
      result: result1
    });

    // This should not be cleared bc its id DOESN'T match the removed record id
    await cacheMap.set({
      method: 'get',
      id: 2,
      result: result2
    });

    const newContext = await contextCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.map.keys().length, 1);
  });
});
