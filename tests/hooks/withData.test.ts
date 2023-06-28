import assert from 'assert';
import {withData} from '../../src';

describe('withData', () => {
  it('Merges the data', async () => {
    const context = {
      params: {},
      data: { name: 'Johnny Cash' }
    };

    const newContext = await withData({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.data, {
      name: 'Johnny Cash',
      addedProp: 'addedProp'
    });
  });

  it('Works when `context.data` is an array', async () => {
    const context = {
      params: {},
      data: [{ name: 'Johnny Cash' }, { name: 'Patsy Cline' }]
    };

    const newContext = await withData({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.data, [
      {
        name: 'Johnny Cash',
        addedProp: 'addedProp'
      },
      {
        name: 'Patsy Cline',
        addedProp: 'addedProp'
      }
    ]);
  });
});
