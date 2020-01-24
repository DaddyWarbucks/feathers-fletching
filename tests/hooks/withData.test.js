const assert = require('assert');
const withData = require('../../src/hooks/withData');

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

  it('Works with all virtual types', async () => {
    const context = {
      params: {},
      data: { name: 'Johnny Cash' }
    };

    const newContext = await withData({
      prop1: 'primitive',
      prop2: () => true,
      prop3: () => new Promise(resolve => resolve(true))
    })(context);

    await assert.deepEqual(newContext.data, {
      name: 'Johnny Cash',
      prop1: 'primitive',
      prop2: true,
      prop3: true
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
