const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');
const sequelizeJoinQuery = require('../../src/hooks/sequelizeJoinQuery');

describe('sequelizeJoinQuery', () => {
  const app = feathers();

  const service = memory();

  const rating = {
    target: {}
  };

  const owner = {
    target: {}
  };

  const artist = {
    target: {
      associations: { rating }
    }
  };

  const label = {
    target: {
      associations: { owner }
    }
  };

  service.getModel = () => {
    return {
      associations: { artist, label }
    };
  };

  app.use('api/albums', service);

  it('Joins an association query', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          '$artist.name$': 'Johnny Cash'
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true
        }
      ]
    });
  });

  it('Joins multiple association queries', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          '$artist.name$': 'Johnny Cash',
          '$label.name$': 'Sun Studios'
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true
        },
        {
          association: label,
          attributes: [],
          required: true
        }
      ]
    });
  });

  it('Joins a nested association query', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          '$artist.rating.score$': 100
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true,
          include: [
            {
              association: rating,
              attributes: [],
              required: true
            }
          ]
        }
      ]
    });
  });

  it('Joins multiple nested association queries', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          '$artist.rating.score$': 100,
          '$label.owner.name$': 'Bob McHits'
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true,
          include: [
            {
              association: rating,
              attributes: [],
              required: true
            }
          ]
        },
        {
          association: label,
          attributes: [],
          required: true,
          include: [
            {
              association: owner,
              attributes: [],
              required: true
            }
          ]
        }
      ]
    });
  });

  it('Joins the $or association query', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          $or: [
            {
              '$artist.name$': 'Johnny Cash',
              '$artist.name$': 'Elvis Presly'
            }
          ]
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true
        }
      ]
    });
  });

  it('$sorts an association query', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          $sort: { '$artist.name$': 1 }
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true
        }
      ],
      order: [[artist, 'name', 'ASC']]
    });

    await assert.deepStrictEqual(newContext.params.query.$sort, undefined);
  });

  it('$sorts a nested association query', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          $sort: { '$artist.rating.score$': 1 }
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true,
          include: [
            {
              association: rating,
              attributes: [],
              required: true
            }
          ]
        }
      ],
      order: [[artist, rating, 'score', 'ASC']]
    });

    await assert.deepStrictEqual(newContext.params.query.$sort, undefined);
  });

  it('$sorts multiple nested association queries', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          $sort: {
            '$artist.rating.score$': 1,
            '$label.owner.name$': 1
          }
        }
      }
    };

    const newContext = await sequelizeJoinQuery()(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          attributes: [],
          required: true,
          include: [
            {
              association: rating,
              attributes: [],
              required: true
            }
          ]
        },
        {
          association: label,
          attributes: [],
          required: true,
          include: [
            {
              association: owner,
              attributes: [],
              required: true
            }
          ]
        }
      ],
      order: [[artist, rating, 'score', 'ASC'], [label, owner, 'name', 'ASC']]
    });

    await assert.deepStrictEqual(newContext.params.query.$sort, undefined);
  });

  it('Can use a custom makeIncludeOptions function', async () => {
    const context = {
      app,
      service,
      type: 'before',
      method: 'find',
      params: {
        query: {
          '$artist.name$': 'Johnny Cash'
        }
      }
    };

    const newContext = await sequelizeJoinQuery({
      makeIncludeOptions: () => {
        return {
          required: false,
          attributes: ['something']
        };
      }
    })(context);

    await assert.deepStrictEqual(newContext.params.sequelize, {
      include: [
        {
          association: artist,
          required: false,
          attributes: ['something']
        }
      ]
    });
  });
});
