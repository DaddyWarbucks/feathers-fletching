import assert from 'assert';
import { withQuery } from '../../src';

describe('withQuery', () => {
  it('Merges the query', async () => {
    const context = {
      params: { query: { name: 'Johnny Cash' } }
    };

    const newContext = await withQuery({
      addedProp: () => 'addedProp'
    })(context);

    await assert.deepEqual(newContext.params.query, {
      name: 'Johnny Cash',
      addedProp: 'addedProp'
    });
  });
});
