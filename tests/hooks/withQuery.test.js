const assert = require('assert');
const withQuery = require('../../src/hooks/withQuery');

describe('withQuery', () => {
  it('Merges the query', async () => {
    const context = {
      params: { query: { name: 'Johnny Cash' } }
    };

    const newContext = await withQuery({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.params.query, {
      name: 'Johnny Cash',
      addedProp: 'addedProp'
    });
  });

  it('Works with all virtual types', async () => {
    const context = {
      params: { query: { name: 'Johnny Cash' } }
    };

    const newContext = await withQuery({
      prop1: 'primitive',
      prop2: () => true,
      prop3: () => new Promise(resolve => resolve(true))
    })(context);

    await assert.deepEqual(newContext.params.query, {
      name: 'Johnny Cash',
      prop1: 'primitive',
      prop2: true,
      prop3: true
    });
  });
});
