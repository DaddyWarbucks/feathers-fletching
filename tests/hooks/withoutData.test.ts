import assert from 'assert';
import {withoutData} from '../../src';

describe('withoutData', () => {
  it('Removes values from `context.data`', async () => {
    const context = {
      data: { name: 'Johnny Cash', email: 'email@example.com' }
    };

    const newContext = await withoutData({
      email: false
    })(context);

    await assert.deepEqual(newContext.data, { name: 'Johnny Cash' });
  });

  it('Works when `context.data` is an array', async () => {
    const context = {
      data: [
        { name: 'Johnny Cash', email: 'email@example.com' },
        { name: 'Patsy Cline', email: 'email@example.com' }
      ]
    };

    const newContext = await withoutData({
      email: false
    })(context);

    await assert.deepEqual(newContext.data, [
      { name: 'Johnny Cash' },
      { name: 'Patsy Cline' }
    ]);
  });

  it('Works when `virtuals` is an array', async () => {
    const context = {
      data: { name: 'Johnny Cash', email: 'email@example.com' }
    };

    const newContext = await withoutData(['email'])(context);

    await assert.deepEqual(newContext.data, { name: 'Johnny Cash' });
  });
});
