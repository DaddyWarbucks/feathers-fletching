const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');
const joinQuery = require('../../src/hooks/joinQuery2');

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
    memory({
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
    memory({
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
    memory({
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
      artist_id: { $in: [1] }
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
      artist_id: { $in: [1] }
    });
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

    const shouldReject = joinQuery(joinQueryOptions)(context);

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

    const shouldReject = joinQuery(joinQueryOptions)(context);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Throws NotFound error if no matches for PATCH', async () => {
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

    const shouldReject = joinQuery(joinQueryOptions)(context);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Throws NotFound error if no matches for REMOVE', async () => {
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

    const shouldReject = joinQuery(joinQueryOptions)(context);

    await assert.rejects(shouldReject, { name: 'NotFound' });
  });

  it('Does not throw NotFound error if no matches for FIND', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          artist: { name: 'Elvis' }
        }
      }
    };

    const newContext = await joinQuery(joinQueryOptions)(context);

    await assert.deepStrictEqual(newContext.params.result, {
      total: 0,
      data: []
    });
  });

  it('Throws NotFound error if no $or matches', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $or: [{ artist: { name: 'Elvis' } }]
        }
      }
    };

    const shouldReject = joinQuery(joinQueryOptions)(context);

    await assert.rejects(shouldReject, { name: 'NotFound' });
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
      artist_id: { $in: ['1'] }
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

  it('Can $sort on joined queries', async () => {
    // Query: $sort albums by artist name
    const beforeContext = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          artist: { $sort: { name: 1 } }
        }
      }
    };

    const newBeforeContext = await joinQuery(joinQueryOptions)(beforeContext);

    const afterContext = {
      type: 'after',
      method: 'find',
      result: [
        { id: 3, title: 'Life in Nashville', artist_id: 2 },
        { id: 2, title: 'I Wont Back Down', artist_id: 1 }
      ]
    };

    const newAfterContext = await joinQuery(joinQueryOptions)(
      Object.assign(newBeforeContext, afterContext)
    );

    await assert.deepStrictEqual(newAfterContext.result, [
      { id: 2, title: 'I Wont Back Down', artist_id: 1 },
      { id: 3, title: 'Life in Nashville', artist_id: 2 }
    ]);
  });

  it('Can $sort on joined queries via dot.path', async () => {
    // Query: $sort albums by artist name
    const beforeContext = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $sort: {
            'artist.name': 1
          }
        }
      }
    };

    const newBeforeContext = await joinQuery(joinQueryOptions)(beforeContext);

    const afterContext = {
      type: 'after',
      method: 'find',
      result: [
        { id: 3, title: 'Life in Nashville', artist_id: 2 },
        { id: 2, title: 'I Wont Back Down', artist_id: 1 }
      ]
    };

    const newAfterContext = await joinQuery(joinQueryOptions)(
      Object.assign(newBeforeContext, afterContext)
    );

    await assert.deepStrictEqual(newAfterContext.result, [
      { id: 2, title: 'I Wont Back Down', artist_id: 1 },
      { id: 3, title: 'Life in Nashville', artist_id: 2 }
    ]);
  });

  it('Can $sort on joined $or queries', async () => {
    // Query: $sort albums by artist name
    const beforeContext = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $or: [{ artist: { $sort: { name: 1 } } }]
        }
      }
    };

    const newBeforeContext = await joinQuery(joinQueryOptions)(beforeContext);

    const afterContext = {
      type: 'after',
      method: 'find',
      result: [
        { id: 3, title: 'Life in Nashville', artist_id: 2 },
        { id: 2, title: 'I Wont Back Down', artist_id: 1 }
      ]
    };

    const newAfterContext = await joinQuery(joinQueryOptions)(
      Object.assign(newBeforeContext, afterContext)
    );

    await assert.deepStrictEqual(newAfterContext.result, [
      { id: 2, title: 'I Wont Back Down', artist_id: 1 },
      { id: 3, title: 'Life in Nashville', artist_id: 2 }
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
      id: { $in: [1, 2] }
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

  it('Can be used in an $or query and dot.path', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $or: [{ title: 'Man in Black' }, { 'artist.name': 'Patsy Cline' }]
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

  it('Can handle paginate:false', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        paginate: false,
        query: {
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    let usesPaginateFalse = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesPaginateFalse = defaultParams.paginate === false;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesPaginateFalse, true);
  });

  it('Can handle no service paginate option', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    // const albumsService =
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

    app.service('api/albums').options.paginate = false;

    let usesPaginateFalse = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesPaginateFalse = defaultParams.paginate === false;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesPaginateFalse, true);

    app.service('api/albums').options.paginate = {
      default: 10,
      max: 100
    };
  });

  it('Can handle no join-service paginate option', async () => {
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

    app.service('api/artists').options.paginate = false;

    let usesLimit = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesLimit = defaultParams.query.$limit === 10;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesLimit, true);

    app.service('api/artists').options.paginate = {
      default: 10,
      max: 100
    };
  });

  it('Can handle $limit:1', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $limit: 1,
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    let usesLimit = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesLimit = defaultParams.query.$limit === 1;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesLimit, true);
  });

  it('Can handle $limit:0', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $limit: 0,
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    let usesPaginateFalse = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesPaginateFalse = defaultParams.paginate === false;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesPaginateFalse, true);
  });

  it('Can handle $skip', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          $skip: 1,
          artist: { name: 'Johnny Cash' }
        }
      }
    };

    let usesPaginateFalse = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesPaginateFalse = defaultParams.paginate === false;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesPaginateFalse, true);
  });

  it('Can handle default pagination', async () => {
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

    let usesLimit = null;

    await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        makeParams: async defaultParams => {
          usesLimit = defaultParams.query.$limit === 10;
          return defaultParams;
        }
      }
    })(context);

    await assert.deepStrictEqual(usesLimit, true);
  });

  it('Does not overwrite user query', async () => {
    // Query: which albums have an artist with name 'Johnny Cash'
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          artist_id: 1,
          artist: { name: 'Patsy Cline' }
        }
      }
    };

    const newContext = await joinQuery({
      artist: {
        ...joinQueryOptions.artist,
        overwrite: false
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.query, {
      artist_id: 1,
      $and: [{ artist_id: { $in: [2] } }]
    });
  });
});
