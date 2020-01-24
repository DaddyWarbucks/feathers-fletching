const assert = require('assert');
const withResult = require('../../src/hooks/withResult');

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

  it('Works with all virtual types', async () => {
    const context = {
      params: {},
      result: { name: 'Johnny Cash' }
    };

    const newContext = await withResult({
      prop1: 'primitive',
      prop2: () => true,
      prop3: () => new Promise(resolve => resolve(true))
    })(context);

    await assert.deepEqual(newContext.result, {
      name: 'Johnny Cash',
      prop1: 'primitive',
      prop2: true,
      prop3: true
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
