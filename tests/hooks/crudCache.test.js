const assert = require('assert');
const crudCache = require('../../src/hooks/crudCache');

describe('crudCache', () => {
  const result1 = { id: 1, title: 'The Man in Black' };
  const result2 = { id: 2, title: 'I Wont Back Down' };

  it('Returns from the cache on get()', async () => {
    const context = {
      type: 'before',
      method: 'get',
      id: 1
    };

    const cacheMap = new Map();
    cacheMap.set('1', result1);

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), newContext.result);
  });

  it('Does not return from the cache on get() if querying', async () => {
    const context = {
      type: 'before',
      method: 'get',
      id: 1,
      params: { query: { title: 'The Man in Black' } }
    };

    const cacheMap = new Map();
    cacheMap.set('1', result1);

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(newContext.result, undefined);
  });

  it('Caches records on find()', async () => {
    const context = {
      type: 'after',
      method: 'find',
      result: { data: [result1, result2] }
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), result1);
    await assert.deepEqual(cacheMap.get('2'), result2);
  });

  it('Caches records on get()', async () => {
    const context = {
      type: 'after',
      method: 'get',
      result: result1
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), result1);
  });

  it('Caches records on create()', async () => {
    const context = {
      type: 'after',
      method: 'create',
      result: result1
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), result1);
  });

  it('Caches records on update()', async () => {
    const context = {
      type: 'after',
      method: 'update',
      result: result1
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), result1);
  });

  it('Caches records on patch()', async () => {
    const context = {
      type: 'after',
      method: 'patch',
      result: result1
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), result1);
  });

  it('Removes records on remove()', async () => {
    const context = {
      type: 'after',
      method: 'remove',
      result: result1
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), undefined);
  });

  it('Does not cache records when filtering', async () => {
    const context = {
      type: 'after',
      method: 'find',
      params: { query: { $select: ['title'] } }
    };

    const cacheMap = new Map();

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(cacheMap.get('1'), undefined);
  });

  it('Can use a custom getResultKey option', async () => {
    const context = {
      type: 'after',
      method: 'find',
      result: [result1]
    };

    const cacheMap = new Map();

    const getResultKey = result => result.id;

    const newContext = await crudCache(cacheMap, { getResultKey })(context);

    await assert.deepEqual(cacheMap.get('1'), result1);
  });

  it('Can use a custom makeCacheKey option', async () => {
    const context = {
      type: 'after',
      method: 'find',
      result: [result1]
    };

    const cacheMap = new Map();

    const makeCacheKey = key => 'myKey';

    const newContext = await crudCache(cacheMap, { makeCacheKey })(context);

    await assert.deepEqual(cacheMap.get('myKey'), result1);
  });

  it('Can use a custom isFiltering option', async () => {
    const context = {
      type: 'after',
      method: 'find',
      params: { isMutating: true },
      result: [result1]
    };

    const cacheMap = new Map();

    const isFiltering = context => context.params.isMutating;

    const newContext = await crudCache(cacheMap, { isFiltering })(context);

    await assert.deepEqual(cacheMap.get('1'), undefined);
  });

  it('Can use a custom isQuerying option', async () => {
    const context = {
      type: 'before',
      method: 'get',
      id: 1,
      // params: { query: { expires: { $lt: new Date() } } }
      params: { query: { title: 'The Man in Black' } }
    };

    const cacheMap = new Map();
    cacheMap.set('1', result1);

    const isQuerying = context => {
      // Do not return from cache if the user is querying by expires
      // otherwise we can return from cache
      return context.params.query.expires !== undefined;
    };

    const newContext = await crudCache(cacheMap, { isQuerying })(context);

    await assert.deepEqual(cacheMap.get('1'), context.result);
  });

  it('Can handle an async cacheMap', async () => {
    const context = {
      type: 'before',
      method: 'get',
      id: 1
    };

    const map = new Map();
    const cacheMap = {
      get: async key => map.get(key),
      set: async (key, result) => map.set(key, result),
      delete: async key => map.delete(key)
    };

    await cacheMap.set('1', result1);

    const newContext = await crudCache(cacheMap)(context);

    await assert.deepEqual(await cacheMap.get('1'), context.result);
  });
});
