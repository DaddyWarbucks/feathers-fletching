const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');

const stash = stashFunc => {
  let stashed = null;
  return context => {
    return () => {
      if (!stashed) {
        stashed = stashFunc(context);
      }
      return stashed;
    };
  };
};

const stashFunc = context => {
  if (context.id) {
    return context.service.get(context.id, context.params);
  }

  const findParams = Object.assign({}, context.params, { paginate: false });
  return context.service.find(findParams);
};

const stashable = _options => {
  const options = Object.assign({ propName: 'stashed', stashFunc }, _options);

  return context => {
    context.params[options.propName] = stash(options.stashFunc)(context);
    return context;
  };
};

describe('stashable', () => {
  const app = feathers();

  const JC = { id: 1, title: 'The Man in Black', artist_id: 1 };

  app.use('api/albums', memory({ store: { 1: JC } }));

  it('Returns a stashed value', async () => {
    const context = {
      app,
      id: 1,
      service: app.service('api/albums'),
      params: {}
    };

    const newContext = await stashable()(context);

    const stashed = await newContext.params.stashed();

    await assert.deepStrictEqual(stashed, JC);

    calledCount = 0;
  });

  it('Only calls the stash function once', async () => {
    const context = {
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
      app,
      id: 1,
      service: app.service('api/albums'),
      params: {}
    };

    const stashFunc = context => ({ stashed: true });

    const newContext = await stashable({ stashFunc })(context);

    const stashed = newContext.params.stashed();

    await assert.deepStrictEqual(stashed, { stashed: true });
  });
});
