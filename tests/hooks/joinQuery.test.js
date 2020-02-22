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
