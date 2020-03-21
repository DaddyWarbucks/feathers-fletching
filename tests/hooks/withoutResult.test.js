const assert = require('assert');
const withoutResult = require('../../src/hooks/withoutResult');

describe('withoutResult', () => {
  it('Filters the result with falsy values', async () => {
    const context = {
      result: {
        name: 'Johnny Cash',
        prop1: 'prop1',
        prop2: 'prop2',
        prop3: 'prop3',
        prop4: 'prop4',
        prop5: 'prop5'
      }
    };

    const newContext = await withoutResult({
      prop1: null,
      prop2: undefined,
      prop3: false,
      prop4: 0,
      prop5: ''
    })(context);

    await assert.deepEqual(newContext.result, {
      name: 'Johnny Cash'
    });
  });

  it('Keeps the result with truthy values', async () => {
    const context = {
      result: {
        name: 'Johnny Cash',
        prop1: 'prop1',
        prop2: 'prop2',
        prop3: 'prop3',
        prop4: 'prop4'
      }
    };

    const newContext = await withoutResult({
      prop1: [],
      prop2: {},
      prop3: 'Oh Yea!',
      prop4: 1
    })(context);

    await assert.deepEqual(newContext.result, {
      name: 'Johnny Cash',
      prop1: 'prop1',
      prop2: 'prop2',
      prop3: 'prop3',
      prop4: 'prop4'
    });
  });

  it('Works with all virtual types', async () => {
    const context = {
      result: {
        name: 'Johnny Cash',
        prop1: 'prop1',
        prop2: 'prop2',
        prop3: 'prop3'
      }
    };

    const newContext = await withoutResult({
      prop1: 'primitive',
      prop2: () => true,
      prop3: () => new Promise(resolve => resolve(true))
    })(context);

    await assert.deepEqual(newContext.result, {
      name: 'Johnny Cash',
      prop1: 'prop1',
      prop2: 'prop2',
      prop3: 'prop3'
    });
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
