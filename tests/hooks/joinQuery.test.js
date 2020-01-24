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
  //       { title: 'The Man in Black', artist_id: 123 },
  //       { title: 'I Wont Back Down', artist_id: 123 },
  //       { title: 'Life in Nashville', artist_id: 456 }
  //     ]
  //   })
  // );

  app.use(
    'api/artists',
    memory({
      store: [
        { id: 123, name: 'Johnny Cash' },
        { id: 456, name: 'Patsy Cline' }
      ]
    })
  );

  it('Joins the query', async () => {
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

    await assert.deepEqual(newContext.params.query, {
      artist_id: { $in: [123] }
    });
  });
});
