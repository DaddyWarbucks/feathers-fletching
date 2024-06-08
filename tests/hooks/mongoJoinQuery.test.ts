import assert from 'assert';
import { feathers } from '@feathersjs/feathers';
import { MemoryService } from '@feathersjs/memory';
import { mongoJoinQuery } from '../../src';

class MongoMemoryService extends MemoryService {
  constructor(options) {
    super(options);
  }
  getOptions() {
    return this.options;
  }
  async getModel() {
    return this.options.Model;
  }
}

describe('mongoJoinQuery', () => {
  const app = feathers();

  app.use(
    'api/albums',
    new MongoMemoryService({
      // @ts-ignore
      associations: {
        artist: {
          service: 'api/artists',
          localField: 'artist_id',
          foreignField: 'id'
        }
      },
      Model: {
        collectionName: 'api/albums'
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
    new MongoMemoryService({
      associations: {
        scores: {
          service: 'api/scores',
          localField: 'id',
          foreignField: 'album_id'
        }
      },
      Model: {
        collectionName: 'api/artists'
      },
      store: {
        1: { id: 1, name: 'Johnny Cash' },
        2: { id: 2, name: 'Patsy Cline' },
        3: { id: 3, name: 'June Carter' }
      }
    })
  );

  app.use(
    'api/scores',
    new MongoMemoryService({
      Model: {
        collectionName: 'api/scores'
      },
      store: {
        1: { id: 1, album_id: null, rating: 5 },
        2: { id: 2, album_id: 1, rating: 5 },
        3: { id: 3, album_id: 2, name: 5 }
      }
    })
  );

  it('Makes the join pipeline', async () => {
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

    const newContext = await mongoJoinQuery(context);

    const pipeline = [
      {
        $lookup: {
          from: 'api/artists',
          localField: 'artist_id',
          foreignField: 'id',
          as: 'artist',
          pipeline: [
            {
              $project: {
                name: 1
              }
            }
          ]
        }
      },
      {
        $feathers: {}
      }
    ];

    await assert.deepStrictEqual(newContext.params.pipeline, pipeline);
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

    const newContext = await mongoJoinQuery(context);

    const pipeline = [
      {
        $lookup: {
          from: 'api/artists',
          localField: 'artist_id',
          foreignField: 'id',
          as: 'artist',
          pipeline: [
            {
              $project: {
                name: 1,
                id: 1
              }
            }
          ]
        }
      },
      {
        $feathers: {}
      }
    ];

    await assert.deepStrictEqual(newContext.params.pipeline, pipeline);
  });

  it('Can handle nested pipelines', async () => {
    const context = {
      app,
      service: app.service('api/albums'),
      type: 'before',
      method: 'find',
      params: {
        query: {
          'artist.name': 'Johnny Cash',
          'artist.scores.rating': 5
        }
      }
    };

    const newContext = await mongoJoinQuery(context);

    const pipeline = [
      {
        $lookup: {
          from: 'api/artists',
          localField: 'artist_id',
          foreignField: 'id',
          as: 'artist',
          pipeline: [
            {
              $project: {
                name: 1
              }
            },
            {
              $lookup: {
                from: 'api/scores',
                localField: 'id',
                foreignField: 'album_id',
                as: 'scores',
                pipeline: [
                  {
                    $project: {
                      rating: 1
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        $feathers: {}
      }
    ];

    await assert.deepStrictEqual(newContext.params.pipeline, pipeline);
  });
});
