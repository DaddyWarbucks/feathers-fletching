const assert = require('assert');
const withoutQuery = require('../../src/hooks/withoutQuery');

describe('withoutQuery', () => {
  it('Removes values from `context.params.query`', async () => {
    const context = {
      params: {
        query: { name: 'Johnny Cash', email: 'email@example.com' }
      }
    };

    const newContext = await withoutQuery({
      email: false
    })(context);

    await assert.deepEqual(newContext.params.query, { name: 'Johnny Cash' });
  });

  it('Works when `virtuals` is an array', async () => {
    const context = {
      params: {
        query: { name: 'Johnny Cash', email: 'email@example.com' }
      }
    };

    const newContext = await withoutQuery(['email'])(context);

    await assert.deepEqual(newContext.params.query, { name: 'Johnny Cash' });
  });
});
