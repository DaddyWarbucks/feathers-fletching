import assert from 'assert';
import {withResult} from '../../src';

describe('withResult', () => {
  it('Merges the result', async () => {
    const context = {
      params: {},
      result: { name: 'Johnny Cash' }
    };

    const newContext = await withResult({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.result, {
      name: 'Johnny Cash',
      addedProp: 'addedProp'
    });
  });

  it('Works when `context.result` is an array', async () => {
    const context = {
      params: {},
      result: [{ name: 'Johnny Cash' }, { name: 'Patsy Cline' }]
    };

    const newContext = await withResult({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.result, [
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

  it('Works when `context.result.data` is present', async () => {
    const context = {
      method: 'find',
      params: {},
      result: {
        data: [{ name: 'Johnny Cash' }, { name: 'Patsy Cline' }]
      }
    };

    const newContext = await withResult({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.result.data, [
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
