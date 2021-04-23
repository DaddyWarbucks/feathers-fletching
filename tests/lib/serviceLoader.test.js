const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');
const ServiceLoader = require('../../src/lib/serviceLoader');

describe('ServiceLoader', () => {
  const app = feathers();

  app.use(
    'api/albums',
    memory({
      store: {
        1: { id: 1, alt_id: 1, title: 'Man in Black', artist_id: 1 },
        2: { id: 2, alt_id: 2, title: 'I Wont Back Down', artist_id: 1 },
        3: { id: 3, alt_id: 3, title: 'Life in Nashville', artist_id: 2 }
      }
    })
  );

  const service = app.service('api/albums');

  service.hooks({
    before: {
      all: [
        context => {
          if (context.params.myFunc) {
            context.params.myFunc();
          }
        }
      ]
    }
  });

  let serviceLoader = new ServiceLoader(service);

  beforeEach(() => {
    serviceLoader = new ServiceLoader(service);
  });

  it('Creates a get() loader with same id', async () => {
    await serviceLoader.get(1);
    await serviceLoader.get(1);
    assert.deepEqual(serviceLoader.getCache.size, 1);
  });

  it('Creates a get() loader with different id', async () => {
    await serviceLoader.get(1);
    await serviceLoader.get(2);
    assert.deepEqual(serviceLoader.getCache.size, 2);
  });

  it('Creates a get() loader with same id and params', async () => {
    await serviceLoader.get(1, { query: { title: 'Man in Black' } });
    await serviceLoader.get(1, { query: { title: 'Man in Black' } });
    assert.deepEqual(serviceLoader.getCache.size, 1);
  });

  it('Creates a get() loader with same id and different params', async () => {
    await serviceLoader.get(1, { query: { title: 'Man in Black' } });
    await serviceLoader.get(1, { query: { artist_id: 1 } });
    assert.deepEqual(serviceLoader.getCache.size, 2);
  });

  it('Fails to create get() loader with func in params', async () => {
    const shouldReject = async () => serviceLoader.get(1, { myFunc: () => { } });
    await assert.rejects(shouldReject);
  });

  it('Passes extra params to get() loader', async () => {
    let called = false;
    await serviceLoader.get(
      1,
      { query: { title: 'Man in Black' } },
      {
        myFunc: () => {
          called = true;
        }
      }
    );
    assert.deepEqual(called, true);
  });

  it('get() loader loads the proper value', async () => {
    const result1 = await service.get(1, {
      query: { title: 'Man in Black' }
    });
    const result2 = await serviceLoader.get(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(result1, result2);
  });

  it('get() loader loads the proper value with params', async () => {
    const result1 = await service.get(1);
    const result2 = await serviceLoader.get(1);
    assert.deepEqual(result1, result2);
  });

  it('get() loader can be cleared by id', async () => {
    await serviceLoader.get(1);
    assert.deepEqual(serviceLoader.getCache.size, 1);
    serviceLoader.clearGet(1);
    assert.deepEqual(serviceLoader.getCache.size, 0);
  });

  it('get() loader can be cleared progressively', async () => {
    await serviceLoader.get(1);
    await serviceLoader.get(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(serviceLoader.getCache.size, 2);
    serviceLoader.clearGet(1);
    assert.deepEqual(serviceLoader.getCache.size, 0);
  });

  it('get() loader can be cleared progressively by params', async () => {
    await serviceLoader.get(1);
    await serviceLoader.get(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(serviceLoader.getCache.size, 2);
    serviceLoader.clearGet(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(serviceLoader.getCache.size, 1);
  });

  it('get() loader can be cleared all', async () => {
    await serviceLoader.get(1);
    await serviceLoader.get(2);
    assert.deepEqual(serviceLoader.getCache.size, 2);
    serviceLoader.clearGet();
    assert.deepEqual(serviceLoader.getCache.size, 0);
  });

  it('Creates a find() loader with same params', async () => {
    await serviceLoader.find({ query: { title: 'Man in Black' } });
    await serviceLoader.find({ query: { title: 'Man in Black' } });
    assert.deepEqual(serviceLoader.findCache.size, 1);
  });

  it('Creates a find() loader with different params', async () => {
    await serviceLoader.find({ query: { title: 'Man in Black' } });
    await serviceLoader.find({ query: { title: 'I Wont Back Down' } });
    assert.deepEqual(serviceLoader.findCache.size, 2);
  });

  it('Fails to create find() loader with func in params', async () => {
    const shouldReject = async () => serviceLoader.find({ myFunc: () => { } });
    await assert.rejects(shouldReject);
  });

  it('Passes extra params to find() loader', async () => {
    let called = false;
    await serviceLoader.find(
      { query: { title: 'Man in Black' } },
      {
        myFunc: () => {
          called = true;
        }
      }
    );
    assert.deepEqual(called, true);
  });

  it('find() loader loads the proper value', async () => {
    const result1 = await service.find({
      query: { title: 'Man in Black' }
    });
    const result2 = await serviceLoader.find({
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(result1, result2);
  });

  it('find() loader can be cleared by params', async () => {
    await serviceLoader.find({
      query: { title: 'Man in Black' }
    });
    await serviceLoader.find({
      query: { title: 'I Wont Back Down' }
    });
    assert.deepEqual(serviceLoader.findCache.size, 2);
    serviceLoader.clearFind({
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(serviceLoader.findCache.size, 1);
  });

  it('find() loader can be cleared all', async () => {
    await serviceLoader.find({
      query: { title: 'Man in Black' }
    });
    await serviceLoader.find({
      query: { title: 'I Wont Back Down' }
    });
    assert.deepEqual(serviceLoader.findCache.size, 2);
    serviceLoader.clearFind();
    assert.deepEqual(serviceLoader.findCache.size, 0);
  });

  it('Creates a load() loader', async () => {
    await serviceLoader.load(1);
    assert.deepEqual(serviceLoader.loadCache.size, 1);
  });

  it('Creates a load() loader with custom id', async () => {
    await serviceLoader.load({ alt_id: 1 });
    await serviceLoader.load({ id: 1 });
    assert.deepEqual(serviceLoader.loadCache.size, 2);
  });

  it('Creates a load() loader with different params', async () => {
    await serviceLoader.load(1);
    await serviceLoader.load(1, { query: { title: 'Man in Black' } });
    assert.deepEqual(serviceLoader.loadCache.size, 2);
  });

  it('Creates a load() loader with same params', async () => {
    await serviceLoader.load(1, { query: { title: 'Man in Black' } });
    await serviceLoader.load(1, { query: { title: 'Man in Black' } });
    assert.deepEqual(serviceLoader.loadCache.size, 1);
  });

  it('Fails to create load() loader with func in params', async () => {
    const shouldReject = async () =>
      serviceLoader.load(1, { myFunc: () => { } });
    await assert.rejects(shouldReject);
  });

  it('Passes extra params to load() loader', async () => {
    let called = false;
    await serviceLoader.load(
      1,
      { query: { title: 'Man in Black' } },
      {
        myFunc: () => {
          called = true;
        }
      }
    );
    assert.deepEqual(called, true);
  });

  it('load() loader loads the proper value', async () => {
    const result1 = await service.get(1);
    const result2 = await serviceLoader.load(1);
    assert.deepEqual(result1, result2);
  });

  it('load() loader loads the proper value with params', async () => {
    const result1 = await service.get(1, {
      query: { title: 'Man in Black' }
    });
    const result2 = await serviceLoader.load(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(result1, result2);
  });

  it('load() loader can be cleared by id', async () => {
    await serviceLoader.load(1);
    const loader = serviceLoader.loadCache.get('["id",null]');
    assert.deepEqual(loader._promiseCache.size, 1);
    serviceLoader.clearLoad(1);
    assert.deepEqual(loader._promiseCache.size, 0);
  });

  it('load() loader can be cleared progressively', async () => {
    await serviceLoader.load(1);
    await serviceLoader.load(1, {
      query: { title: 'Man in Black' }
    });
    const loader1 = serviceLoader.loadCache.get('["id",null]');
    const loader2 = serviceLoader.loadCache.get(
      '["id",{"query":{"title":"Man in Black"}}]'
    );
    assert.deepEqual(loader1._promiseCache.size, 1);
    assert.deepEqual(loader2._promiseCache.size, 1);
    serviceLoader.clearLoad(1);
    assert.deepEqual(loader1._promiseCache.size, 0);
    assert.deepEqual(loader2._promiseCache.size, 0);
  });

  it('load() loader can be cleared progressively with params', async () => {
    await serviceLoader.load(1);
    await serviceLoader.load(1, {
      query: { title: 'Man in Black' }
    });
    const loader1 = serviceLoader.loadCache.get('["id",null]');
    const loader2 = serviceLoader.loadCache.get(
      '["id",{"query":{"title":"Man in Black"}}]'
    );
    assert.deepEqual(loader1._promiseCache.size, 1);
    assert.deepEqual(loader2._promiseCache.size, 1);
    serviceLoader.clearLoad(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(loader1._promiseCache.size, 1);
    assert.deepEqual(loader2._promiseCache.size, 0);
  });

  it('load() loader can be cleared all', async () => {
    await serviceLoader.load(1);
    await serviceLoader.load(2);
    await serviceLoader.load(1, {
      query: { title: 'Man in Black' }
    });
    const loader1 = serviceLoader.loadCache.get('["id",null]');
    const loader2 = serviceLoader.loadCache.get(
      '["id",{"query":{"title":"Man in Black"}}]'
    );
    assert.deepEqual(loader1._promiseCache.size, 2);
    assert.deepEqual(loader2._promiseCache.size, 1);
    serviceLoader.clearLoad();
    assert.deepEqual(loader1._promiseCache.size, 0);
    assert.deepEqual(loader2._promiseCache.size, 0);
  });

  it('Creates a loadMany() loader', async () => {
    await serviceLoader.loadMany(1);
    assert.deepEqual(serviceLoader.loadManyCache.size, 1);
  });

  it('Creates a loadMany() loader with custom id', async () => {
    await serviceLoader.loadMany({ artist_id: 1 });
    assert.deepEqual(serviceLoader.loadManyCache.size, 1);
  });

  it('Creates a loadMany() loader with different params', async () => {
    await serviceLoader.loadMany({ artist_id: 1 });
    await serviceLoader.loadMany(
      { artist_id: 1 },
      { query: { title: 'Man in Black' } }
    );
    assert.deepEqual(serviceLoader.loadManyCache.size, 2);
  });

  it('Creates a loadMany() loader with same params', async () => {
    await serviceLoader.loadMany(
      { artist_id: 1 },
      { query: { title: 'Man in Black' } }
    );
    await serviceLoader.loadMany(
      { artist_id: 1 },
      { query: { title: 'Man in Black' } }
    );
    assert.deepEqual(serviceLoader.loadManyCache.size, 1);
  });

  it('loadMany() loader loads the proper value', async () => {
    const result1 = await service.find({ query: { artist_id: 1 } });
    const result2 = await serviceLoader.loadMany({ artist_id: 1 });
    assert.deepEqual(result1, result2);
  });

  it('loadMany() loader loads the proper value with params', async () => {
    const result1 = await service.find({
      query: { artist_id: 2, title: 'Life in Nashville' }
    });
    const result2 = await serviceLoader.loadMany(
      { artist_id: 2 },
      { query: { title: 'Life in Nashville' } }
    );
    assert.deepEqual(result1, result2);
  });

  it('Fails to create loadMany() loader with func in params', async () => {
    const shouldReject = async () =>
      serviceLoader.loadMany({ artist_id: 1 }, { myFunc: () => { } });
    await assert.rejects(shouldReject);
  });

  it('Passes extra params to loadMany() loader', async () => {
    let called = false;
    await serviceLoader.loadMany(
      { artist_id: 1 },
      { query: { title: 'Man in Black' } },
      {
        myFunc: () => {
          called = true;
        }
      }
    );
    assert.deepEqual(called, true);
  });

  it('loadMany() loader can be cleared by id', async () => {
    await serviceLoader.loadMany({ artist_id: 1 });
    const loader = serviceLoader.loadManyCache.get('["artist_id",null]');
    assert.deepEqual(loader._promiseCache.size, 1);
    serviceLoader.clearLoadMany({ artist_id: 1 });
    assert.deepEqual(loader._promiseCache.size, 0);
  });

  it('loadMany() loader can be cleared progressively', async () => {
    await serviceLoader.loadMany({ artist_id: 1 });
    await serviceLoader.loadMany(
      { artist_id: 1 },
      {
        query: { title: 'Man in Black' }
      }
    );
    const loader1 = serviceLoader.loadManyCache.get('["artist_id",null]');
    const loader2 = serviceLoader.loadManyCache.get(
      '["artist_id",{"query":{"title":"Man in Black"}}]'
    );
    assert.deepEqual(loader1._promiseCache.size, 1);
    assert.deepEqual(loader2._promiseCache.size, 1);
    serviceLoader.clearLoadMany({ artist_id: 1 });
    assert.deepEqual(loader1._promiseCache.size, 0);
    assert.deepEqual(loader2._promiseCache.size, 0);
  });

  it('loadMany() loader can be cleared progressively with params', async () => {
    await serviceLoader.loadMany(1);
    await serviceLoader.loadMany(1, {
      query: { title: 'Man in Black' }
    });
    const loader1 = serviceLoader.loadManyCache.get('["id",null]');
    const loader2 = serviceLoader.loadManyCache.get(
      '["id",{"query":{"title":"Man in Black"}}]'
    );
    assert.deepEqual(loader1._promiseCache.size, 1);
    assert.deepEqual(loader2._promiseCache.size, 1);
    serviceLoader.clearLoadMany(1, {
      query: { title: 'Man in Black' }
    });
    assert.deepEqual(loader1._promiseCache.size, 1);
    assert.deepEqual(loader2._promiseCache.size, 0);
  });

  it('loadMany() loader can be cleared all', async () => {
    await serviceLoader.loadMany(1);
    await serviceLoader.loadMany(2);
    await serviceLoader.loadMany(1, {
      query: { title: 'Man in Black' }
    });
    const loader1 = serviceLoader.loadManyCache.get('["id",null]');
    const loader2 = serviceLoader.loadManyCache.get(
      '["id",{"query":{"title":"Man in Black"}}]'
    );
    assert.deepEqual(loader1._promiseCache.size, 2);
    assert.deepEqual(loader2._promiseCache.size, 1);
    serviceLoader.clearLoadMany();
    assert.deepEqual(loader1._promiseCache.size, 0);
    assert.deepEqual(loader2._promiseCache.size, 0);
  });
});
