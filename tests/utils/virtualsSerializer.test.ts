import assert from 'assert';
import { virtualsSerializer, resolver, filterResolver } from '../../src/utils';

describe('virtualsSerializer', () => {
  it('Works with all virtual types for resolver function', async () => {
    const data = { name: 'Johnny Cash' };

    const context = {};

    const prepFunc = () => {};

    const virtuals = {
      '@prop1': () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(true);
          }, 1);
        });
      },
      prop2: data => {
        if (data.prop1 === true) {
          return true;
        }
      },
      prop3: 'primitive',
      prop4: () => true,
      prop5: () => new Promise(resolve => resolve(true))
    };

    const newData = await virtualsSerializer(
      resolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(newData, {
      name: 'Johnny Cash',
      prop1: true,
      prop2: true,
      prop3: 'primitive',
      prop4: true,
      prop5: true
    });
  });

  it('Works with all virtual types for filterResolver function', async () => {
    const data = {
      name: 'Johnny Cash',
      prop1: '',
      prop2: '',
      prop3: '',
      prop4: '',
      prop5: ''
    };

    const context = {};

    const prepFunc = () => {};

    const virtuals = {
      '@prop1': () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(false);
          }, 1);
        });
      },
      prop2: data => {
        if (data.prop1 === false) {
          return false;
        }
      },
      prop3: false,
      prop4: () => false,
      prop5: () => new Promise(resolve => resolve(false))
    };

    const newData = await virtualsSerializer(
      filterResolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(newData, { name: 'Johnny Cash' });
  });

  it('resolver does not return `undefined` as value', async () => {
    const data = { name: 'Johnny Cash' };

    const context = {};

    const prepFunc = () => {};

    const virtuals = {
      prop1: () => {},
      prop2: () => undefined,
      prop3: async () => undefined
    };

    const newData = await virtualsSerializer(
      resolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(newData, { name: 'Johnny Cash' });
  });

  it('filterResolver removes falsey values', async () => {
    const data = {
      name: 'Johnny Cash',
      prop1: '',
      prop2: '',
      prop3: '',
      prop4: '',
      prop5: ''
    };

    const context = {};

    const prepFunc = () => {};

    const virtuals = {
      prop1: null,
      prop2: undefined,
      prop3: false,
      prop4: 0,
      prop5: ''
    };

    const newData = await virtualsSerializer(
      filterResolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(newData, { name: 'Johnny Cash' });
  });

  it('filterResolver keeps truthy values', async () => {
    const data = {
      name: 'Johnny Cash',
      prop1: '',
      prop2: '',
      prop3: '',
      prop4: '',
      prop5: ''
    };

    const context = {};

    const prepFunc = () => {};

    const virtuals = {
      prop1: [],
      prop2: {},
      prop3: 'Oh Yea!',
      prop4: 1
    };

    const newData = await virtualsSerializer(
      filterResolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(newData, data);
  });

  it('calls the prepFunc', async () => {
    const data = {};

    const context = {};

    let prepFuncCalled = false;
    const prepFunc = async () => {
      prepFuncCalled = true;
    };

    const virtuals = {};

    const newData = await virtualsSerializer(
      resolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(prepFuncCalled, true);
  });

  it('calls each virtual with data, context, prepResult args', async () => {
    const data = {
      name: 'Johnny Cash'
    };

    const context = {
      param1: 'param1'
    };

    const prepFunc = async () => {
      return { result1: 'result1' };
    };

    const virtuals = {
      props: (data, context, prepResult) => {
        return {
          name: data.name,
          param1: context.param1,
          result1: prepResult.result1
        };
      }
    };

    const newData = await virtualsSerializer(
      resolver,
      data,
      virtuals,
      context,
      prepFunc
    );

    await assert.deepEqual(newData.props, {
      name: 'Johnny Cash',
      param1: 'param1',
      result1: 'result1'
    });
  });
});
