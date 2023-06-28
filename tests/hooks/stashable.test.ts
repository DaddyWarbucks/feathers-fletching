import assert from 'assert';
import {feathers} from '@feathersjs/feathers';
import {Service } from 'feathers-memory';
import {stashable} from '../../src';

describe('stashable', () => {
  const app = feathers();

  app.use(
    'api/albums',
    new Service({
      store: {
        1: { id: 1, title: 'Man in Black', artist_id: 1 },
        2: { id: 2, title: 'Man in Black', artist_id: 1 }
      }
    })
  );

  const service = app.service('api/albums');

  it('Returns a stashed value', async () => {
    const context = {
      type: 'before',
      method: 'patch',
      app,
      id: 1,
      service: app.service('api/albums'),
      params: {}
    };

    const newContext = await stashable()(context);

    const stashed = await newContext.params.stashed();

    await assert.deepStrictEqual(stashed, service.store['1']);
  });

  it('Only calls the stash function once', async () => {
    const context = {
      type: 'before',
      method: 'patch',
      app,
      id: 1,
      service: app.service('api/albums'),
      params: {}
    };

    const newContext = await stashable()(context);

    const prom1 = newContext.params.stashed();
    const prom2 = newContext.params.stashed();

    await assert(prom1 === prom2);
  });

  it('Can use a custom `propName` option', async () => {
    const context = {
      type: 'before',
      method: 'patch',
      app,
      id: 1,
      service: app.service('api/albums'),
      params: {}
    };

    const newContext = await stashable({ propName: 'cached' })(context);

    await assert(newContext.params.cached !== undefined);
  });

  it('Can use a custom `stashFunc` option', async () => {
    const context = {
      type: 'before',
      method: 'patch',
      app,
      id: 1,
      service: app.service('api/albums'),
      params: {}
    };

    const stashFunc = async context => ({ stashed: true });

    const newContext = await stashable({ stashFunc })(context);

    const stashed = await newContext.params.stashed();

    await assert.deepStrictEqual(stashed, { stashed: true });
  });

  it('Handles multi: true', async () => {
    const context = {
      type: 'before',
      method: 'patch',
      app,
      id: null,
      service: app.service('api/albums'),
      params: {
        query: { id: { $in: [1, 2] } }
      }
    };

    const newContext = await stashable()(context);

    const stashed = await newContext.params.stashed();

    await assert.deepStrictEqual(stashed.length, 2);
  });
});
