import assert from 'assert';
import {feathers} from '@feathersjs/feathers';
import { Service } from 'feathers-memory';
import {joinQuery} from '../../src';

const joinQueryOptions = {
  artist: {
    service: 'api/artists',
    targetKey: 'id',
    foreignKey: 'artist_id'
  }
};

describe('joinQuery', () => {
  const app = feathers();

  app.use(
    'api/albums',
    new Service({
      whitelist: ['$and'],
      multi: true,
      paginate: {
        default: 10,
        max: 100
      },
      store: {
        1: { id: 1, title: 'Man in Black', artist_id: 1 },
        2: { id: 2, title: 'I Wont Back Down', artist_id: 1 },
        3: { id: 3, title: 'Life in Nashville', artist_id: 2 }
      }
    })
  );

  app.use(
    'api/artists',
    new Service({
      whitelist: ['$and'],
      multi: true,
      paginate: {
        default: 10,
        max: 100
      },
      store: {
        1: { id: 1, name: 'Johnny Cash' },
        2: { id: 2, name: 'Patsy Cline' },
        3: { id: 3, name: 'June Carter' }
      }
    })
  );

  app.use(
    'api/ratings',
    new Service({
      whitelist: ['$and'],
      multi: true,
      paginate: {
        default: 10,
        max: 100
      },
      store: {
        1: { id: 1, album_id: null, rating: 5 },
        2: { id: 2, album_id: 1, rating: 5 },
        3: { id: 3, album_id: 2, name: 5 }
      }
    })
  );

  it('Joins the query', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    await assert.deepStrictEqual(newContext.params.query, {
      $and: [{ artist_id: { $in: [1] } }]
    });
  });

  it('Joins the query with dot.paths', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          'artist.name': 'Johnny Cash'
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    await assert.deepStrictEqual(newContext.params.query, {
      $and: [{ artist_id: { $in: [1] } }]
    });
  });

  it('Returns no results on FIND', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'get',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const result = await app.service('api/albums').find(newContext.params);

    await assert.deepStrictEqual(result.total, 0);
  });

  it('Throws NotFound error if no matches for GET', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'get',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const shouldReject = app.service('api/albums').get(1, newContext.params);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Throws NotFound error if no matches for UPDATE', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'update',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const shouldReject = app.service('api/albums').get(1, newContext.params);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Throws NotFound error if no matches for PATCH with ID', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'patch',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const shouldReject = app
      .service('api/albums')
      .patch(1, {}, newContext.params);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Returns no matches for PATCH without ID', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'patch',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const result = await app
      .service('api/albums')
      .patch(null, {}, newContext.params);

    await assert.deepStrictEqual(result, []);
  });

  it('Throws NotFound error if no matches for REMOVE with ID', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'remove',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const shouldReject = app.service('api/albums').remove(1, newContext.params);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Returns no matches for REMOVE without ID', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'remove',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    const result = await app
      .service('api/albums')
      .remove(null, newContext.params);

    await assert.deepStrictEqual(result, []);
  });

  it('Can use a custom makeKey option', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
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
        makeKey: id => id.toString()
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {
      $and: [{ artist_id: { $in: ['1'] } }]
    });
  });

  it('Can use a overwrite option', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
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
        overwrite: true
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {
      artist_id: { $in: [1] }
    });
  });

  it('Can use a custom makeParams option', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    let makeParamsCalled = false;

    await joinQuery({
      artist: {
        service: 'api/artists',
        targetKey: 'id',
        foreignKey: 'artist_id',
        makeParams: async defaultParams => {
          makeParamsCalled = true;
          return defaultParams;
        }
      }
    })(context);

    // See the app.service('api/artists')
    await assert.deepStrictEqual(makeParamsCalled, true);
  });

  it('Can sort FIND', async () => {
    const beforeContext = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $sort: {
            'artist.name': -1
          }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(beforeContext);

    await assert.deepStrictEqual(newContext.result, {
      data: [
        { id: 3, title: 'Life in Nashville', artist_id: 2 },
        { id: 1, title: 'Man in Black', artist_id: 1 },
        { id: 2, title: 'I Wont Back Down', artist_id: 1 }
      ],
      total: 3,
      limit: undefined,
      skip: 0
    });
  });

  it('Sorts on multi:true mutations', async () => {
    const beforeContext = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'patch',
      params: {
        query: {
          $sort: {
            'artist.name': -1
          }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(beforeContext);

    const result = await app
      .service('api/albums')
      .patch(null, {}, newContext.params);

    const afterContext = {
      ...newContext,
      id: null,
      type: 'after',
      result
    };

    const resultContext = await joinQuery(joinQueryOptions)(afterContext);

    await assert.deepStrictEqual(resultContext.result, [
      { id: 3, title: 'Life in Nashville', artist_id: 2 },
      { id: 1, title: 'Man in Black', artist_id: 1 },
      { id: 2, title: 'I Wont Back Down', artist_id: 1 }
    ]);
  });

  it('Can handle a nullable association field', async () => {
    // Query: which albums have a 5 star rating
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
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
      $and: [{ id: { $in: [1, 2] } }]
    });
  });

  it('Can be used in an $or query', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $or: [{ title: 'Man in Black' }, { artist: { name: 'Patsy Cline' } }]
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    await assert.deepStrictEqual(newContext.params.query, {
      $or: [{ title: 'Man in Black' }, { artist_id: { $in: [2] } }]
    });
  });

  it('Can handle multiple $or queries', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $or: [
            { title: 'Man in Black' },
            { 'artist.name': 'Patsy Cline' },
            { 'artist.name': 'Johnny Cash' }
          ]
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    await assert.deepStrictEqual(newContext.params.query, {
      $or: [
        { title: 'Man in Black' },
        { artist_id: { $in: [2] } },
        { artist_id: { $in: [1] } }
      ]
    });
  });

  it('Can handle nested $or/$and queries', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $and: [
            { title: 'Man in Black' },
            {
              $or: [{ 'artist.name': 'Patsy Cline' }, { 'artist.id': 2 }]
            }
          ]
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    await assert.deepStrictEqual(newContext.params.query, {
      $and: [
        { title: 'Man in Black' },
        {
          $or: [
            {
              artist_id: { $in: [2] }
            },
            {
              artist_id: { $in: [2] }
            }
          ]
        }
      ]
    });
  });
});
