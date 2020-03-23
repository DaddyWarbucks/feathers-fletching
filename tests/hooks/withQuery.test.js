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

  it('Can handle when params not present', async () => {
    const context = {};

    const newContext = await withQuery({
      prop1: 'primitive'
    })(context);

    await assert.deepEqual(newContext.params.query, {
      prop1: 'primitive'
    });
  });
});
