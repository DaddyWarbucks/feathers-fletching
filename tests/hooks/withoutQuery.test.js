const assert = require('assert');
const withoutQuery = require('../../src/hooks/withoutQuery');

describe('withoutQuery', () => {
  it('Filters the query with falsy values', async () => {
    const context = {
      params: {
        query: {
          name: 'Johnny Cash',
          prop1: 'prop1',
          prop2: 'prop2',
          prop3: 'prop3',
          prop4: 'prop4',
          prop5: 'prop5'
        }
      }
    };

    const newContext = await withoutQuery({
      prop1: null,
      prop2: undefined,
      prop3: false,
      prop4: 0,
      prop5: ''
    })(context);

    await assert.deepEqual(newContext.params.query, {
      name: 'Johnny Cash'
    });
  });

  it('Keeps the query with truthy values', async () => {
    const context = {
      params: {
        query: {
          name: 'Johnny Cash',
          prop1: 'prop1',
          prop2: 'prop2',
          prop3: 'prop3',
          prop4: 'prop4'
        }
      }
    };

    const newContext = await withoutQuery({
      prop1: [],
      prop2: {},
      prop3: 'Oh Yea!',
      prop4: 1
    })(context);

    await assert.deepEqual(newContext.params.query, {
      name: 'Johnny Cash',
      prop1: 'prop1',
      prop2: 'prop2',
      prop3: 'prop3',
      prop4: 'prop4'
    });
  });

  it('Works with all virtual types', async () => {
    const context = {
      params: {
        query: {
          name: 'Johnny Cash',
          prop1: 'prop1',
          prop2: 'prop2',
          prop3: 'prop3'
        }
      }
    };

    const newContext = await withoutQuery({
      prop1: 'primitive',
      prop2: () => true,
      prop3: () => new Promise(resolve => resolve(true))
    })(context);

    await assert.deepEqual(newContext.params.query, {
      name: 'Johnny Cash',
      prop1: 'prop1',
      prop2: 'prop2',
      prop3: 'prop3'
    });
  });
});
