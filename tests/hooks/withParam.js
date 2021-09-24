const assert = require('assert');
const withParam = require('../../src/hooks/withParam');

describe('withParam', () => {
  it('Merges the param', async () => {
    const context = {
      params: {},
      param: { name: 'Gene Autry' }
    };

    const newContext = await withParam({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.param, {
      name: 'Gene Autry',
      addedProp: 'addedProp'
    });
  });

  it('Works when `context.param` is an array', async () => {
    const context = {
      params: {},
      data: [{ name: 'Gene Autry' }, { name: 'Loretta Lynn' }]
    };

    const newContext = await withParam({
      addedProp: 'addedProp'
    })(context);

    await assert.deepEqual(newContext.param, [
      {
        name: 'Gene Autry',
        addedProp: 'addedProp'
      },
      {
        name: 'Loretta Lynn',
        addedProp: 'addedProp'
      }
    ]);
  });
});
