const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');
const joinQuery = require('../../src/hooks/joinQuery');

describe('joinQuery', () => {
  const app = feathers();

  // app.use(
  //   'api/albums',
  //   memory({
  //     store: [
  //       { id: 1, title: 'The Man in Black', artist_id: 1 },
  //       { id: 2, title: 'I Wont Back Down', artist_id: 1 },
  //       { id: 3, title: 'Life in Nashville', artist_id: 2 }
  //     ]
  //   })
  // );

  app.use(
    'api/artists',
    memory({
      store: [{ id: 1, name: 'Johnny Cash' }, { id: 2, name: 'Patsy Cline' }]
    })
  );

  var makeParamsCalled = false;

  app.service('api/artists').hooks({
    before: {
      all: [
        context => {
          if (context.params.makeParamsCalled === true) {
            makeParamsCalled = true;
          }
        }
      ]
    }
  });

  app.use(
    'api/ratings',
    memory({
      store: [
        { id: 1, album_id: null, rating: 5 },
        { id: 2, album_id: 1, rating: 5 },
        { id: 3, album_id: 2, name: 5 }
      ]
    })
  );

  it('Joins the query', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      params: {
        query: {
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    const newContext = await joinQuery({
      artist: {
        service: 'api/artists',
        targetKey: 'id',
        foreignKey: 'artist_id'
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {
      artist_id: { $in: ['1'] }
    });
  });

  it('Does not join query if no matches', async () => {
    // Query: which albums have an artist with name 'Elvis'
    const context = {
      app,
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery({
      artist: {
        service: 'api/artists',
        targetKey: 'id',
        foreignKey: 'artist_id'
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {});
  });

  it('Can use a custom makeIds option', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      params: {
        query: {
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    const newContext = await joinQuery({
      artist: {
        service: 'api/artists',
        targetKey: 'id',
        foreignKey: 'artist_id',
        makeIds: async (matches, query, context) => {
          return ['100'];
        }
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {
      artist_id: { $in: ['100'] }
    });
  });

  it('Can use a custom makeParams option', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      params: {
        query: {
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    const newContext = await joinQuery({
      artist: {
        service: 'api/artists',
        targetKey: 'id',
        foreignKey: 'artist_id',
        makeParams: async (query, context) => {
          return {
            makeParamsCalled: true
          };
        }
      }
    })(context);

    // See the app.service('api/artists').hooks()
    await assert.deepStrictEqual(makeParamsCalled, true);
  });

  it('Can handle a nullable association field', async () => {
    // Query: which albums have a 5 star rating
    const context = {
      app,
      params: {
        query: {
          rating: 5
        }
      }
    };

    const newContext = await joinQuery({
      rating: {
        service: 'api/ratings',
        targetKey: 'album_id',
        foreignKey: 'id'
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {
      id: { $in: ['1', '2'] }
    });
  });
});
