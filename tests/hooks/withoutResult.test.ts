import assert from 'assert';
import {withoutResult} from '../../src';

describe('withoutResult', () => {
  it('Removes values from `context.result`', async () => {
    const context = {
      result: { name: 'Johnny Cash', email: 'email@example.com' }
    };

    const newContext = await withoutResult({
      email: false
    })(context);

    await assert.deepEqual(newContext.result, { name: 'Johnny Cash' });
  });

  it('Works when `context.result` is an array', async () => {
    const context = {
      result: [
        { name: 'Johnny Cash', email: 'email@example.com' },
        { name: 'Patsy Cline', email: 'email@example.com' }
      ]
    };

    const newContext = await withoutResult({
      email: false
    })(context);

    await assert.deepEqual(newContext.result, [
      { name: 'Johnny Cash' },
      { name: 'Patsy Cline' }
    ]);
  });

  it('Works when `context.result.data` is present', async () => {
    const context = {
      method: 'find',
      result: {
        data: [
          { name: 'Johnny Cash', email: 'email@example.com' },
          { name: 'Patsy Cline', email: 'email@example.com' }
        ]
      }
    };

    const newContext = await withoutResult({
      email: false
    })(context);

    await assert.deepEqual(newContext.result.data, [
      { name: 'Johnny Cash' },
      { name: 'Patsy Cline' }
    ]);
  });

  it('Works when `virtuals` is an array', async () => {
    const context = {
      result: { name: 'Johnny Cash', email: 'email@example.com' }
    };

    const newContext = await withoutResult(['email'])(context);

    await assert.deepEqual(newContext.result, { name: 'Johnny Cash' });
  });
});
