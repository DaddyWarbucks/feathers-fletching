import assert from 'assert';
import { Resolver } from '../../src/utils';

describe('Resolver', () => {
  it('resolves promises and functions', async () => {
    const context = {
      params: {},
      result: { name: 'Johnny' }
    };

    const resolver = new Resolver({
      asyncName: async ({ name }) => name.toUpperCase(),
      syncName: ({ name }) => name.toUpperCase(),
      promiseName: ({ name }) => {
        return new Promise((resolve) => resolve(name.toUpperCase()));
      }
    });

    const result = await resolver.resolve(context.result, context);

    await assert.deepEqual(result.asyncName, 'JOHNNY');
    await assert.deepEqual(result.syncName, 'JOHNNY');
    await assert.deepEqual(result.promiseName, 'JOHNNY');
  });

  it('resolves siblings', async () => {
    const context = {
      params: {},
      result: { name: 'Johnny' }
    };

    const resolver = new Resolver({
      syncUpper: ({ name }) => name.toUpperCase(),
      asyncUpper: async ({ name }) => name.toUpperCase(),
      syncSiblingName: (result, context, resolver) => {
        const syncUpper = resolver.resolve('syncUpper');
        const asyncUpper = resolver.resolve('asyncUpper');
        return `${syncUpper} ${asyncUpper}`;
      },
      asyncSiblingName: async (result, context, resolver) => {
        const syncUpper = await resolver.resolve('syncUpper');
        const asyncUpper = await resolver.resolve('asyncUpper');
        return `${syncUpper} ${asyncUpper}`;
      },
      nestedSiblingName: async (result, context, resolver) => {
        const asyncSiblingName = await resolver.resolve('asyncSiblingName');
        return asyncSiblingName;
      }
    });

    const result = await resolver.resolve(context.result, context);

    await assert.deepEqual(result.syncSiblingName, 'JOHNNY [object Promise]');
    await assert.deepEqual(result.asyncSiblingName, 'JOHNNY JOHNNY');
    // await assert.deepEqual(result.nestedSiblingName, 'JOHNNY, JOHNNY');
  });

  it('throws errors', async () => {
    const context = {
      params: {},
      result: { name: 'Johnny' }
    };

    const resolver = new Resolver({
      errors: ({ name }) => {
        throw new Error(name);
      }
    });

    await assert.rejects(() => resolver.resolve(context.result, context));
  });

  it('throws resolving siblings', async () => {
    const context = {
      params: {},
      result: { name: 'Johnny' }
    };

    const resolver = new Resolver({
      syncSiblingName: async (result, context, resolver) => {
        const asyncSiblingName = await resolver.resolve('asyncSiblingName');
        return asyncSiblingName;
      },
      asyncSiblingName: async (result, context, resolver) => {
        const syncSiblingName = await resolver.resolve('syncSiblingName');
        return syncSiblingName;
      }
    });

    await assert.rejects(() => resolver.resolve(context.result, context));
  });

  // it('optimizes promises', async () => {
  //   const count = 10000;
  //   const asyncResolvers = 5;
  //   const syncResolvers = 5;
  //   const runs = 5
  //   const resolvers = {};

  //   for (let i = 0; i < asyncResolvers; i++) {
  //     resolvers[`async${i}`] = async ({ id }) => {
  //       return new Promise((resolve) => resolve(id));
  //     }
  //   }

  //   for (let i = 0; i < syncResolvers; i++) {
  //     resolvers[`sync${i}`] = ({ id }) => {
  //       return id;
  //     }
  //   }

  //   const data = Array.from({ length: count }, (_, i) => {
  //     return { id: i }
  //   });

  //   const context = {
  //     params: {},
  //     result: data
  //   }

  //   // Treats all resolvers as either a promise or a function.
  //   for (let index = 0; index < runs; index++) {
  //     const resolver = new Resolver(resolvers);
  //     const funcs = data.map((result) => {
  //       return resolver.resolve(result, context);
  //     })
  //     console.time('sync' + index);
  //     await Promise.all(funcs);
  //     console.timeEnd('sync' + index);

  //   }

  //   // Treats all resolvers as promises.
  //   for (let index = 0; index < runs; index++) {
  //     const resolver = new Resolver(resolvers);
  //     const funcs = data.map((result) => {
  //       return resolver.resolvePromise(result, context);
  //     });
  //     console.time('async' + index);
  //     await Promise.all(funcs);
  //     console.timeEnd('async' + index);
  //   }
  // });
});
