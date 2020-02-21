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

  app.use(
    'api/users',
    memory({
      store: [
        { id: 1, name: 'Alice' },
      ]
    })
  );

  app.use(
    'api/roles',
    memory({
      store: [
        { id: 10, user_id: 1, team_id: null, name: 'customer' },
        { id: 20, user_id: 1, team_id: 1, name: 'team-member' },
        { id: 30, user_id: 1, team_id: 2, name: 'team-lead' }
      ]
    })
  )

  app.use(
    'api/teams',
    memory({
      store: [
        { id: 1, name: 'teamOne' },
        { id: 2, name: 'teamTwo' },
        { id: 3, name: 'teamThree'}
      ]
    })
  )

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


  it('Can handle a nullable association field', async () => {
    // Query: which teams have a role belonging to user_id = 1?
    const context = {
      app,
      params: {
        query: {
          roles: {
            user_id: 1
          }
        }
      }
    }

    const newContext = await joinQuery({
      roles: {
        service: 'api/roles',
        targetKey: 'team_id',
        foreignKey: 'id'
      }
    })(context);

    await assert.deepEqual(newContext.params.query, {
      id: { $in: [1, 2] }
    })

  })
});
