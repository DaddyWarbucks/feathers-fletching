const assert = require('assert');
const withoutData = require('../../src/hooks/withoutData');

describe('withoutData', () => {
  it('Filters the data with falsy values', async () => {
    const context = {
      data: {
        name: 'Johnny Cash',
        prop1: 'prop1',
        prop2: 'prop2',
        prop3: 'prop3',
        prop4: 'prop4',
        prop5: 'prop5'
      }
    };

    const newContext = await withoutData({
      prop1: null,
      prop2: undefined,
      prop3: false,
      prop4: 0,
      prop5: ''
    })(context);

    await assert.deepEqual(newContext.data, {
      name: 'Johnny Cash'
    });
  });

  it('Keeps the data with truthy values', async () => {
    const context = {
      data: {
        name: 'Johnny Cash',
        prop1: 'prop1',
        prop2: 'prop2',
        prop3: 'prop3',
        prop4: 'prop4'
      }
    };

    const newContext = await withoutData({
      prop1: [],
      prop2: {},
      prop3: 'Oh Yea!',
      prop4: 1
    })(context);

    await assert.deepEqual(newContext.data, {
      name: 'Johnny Cash',
      prop1: 'prop1',
      prop2: 'prop2',
      prop3: 'prop3',
      prop4: 'prop4'
    });
  });

  it('Works with all virtual types', async () => {
    const context = {
      data: {
        name: 'Johnny Cash',
        prop1: 'prop1',
        prop2: 'prop2',
        prop3: 'prop3'
      }
    };

    const newContext = await withoutData({
      prop1: 'primitive',
      prop2: () => true,
      prop3: () => new Promise(resolve => resolve(true))
    })(context);

    await assert.deepEqual(newContext.data, {
      name: 'Johnny Cash',
      prop1: 'prop1',
      prop2: 'prop2',
      prop3: 'prop3'
    });
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
});
