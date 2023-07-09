import assert from 'assert';
import { Resolver } from '../../src/utils/resolver';

describe('resolver', () => {
  it('Resolves a sync function in `resolve`', async () => {
    const value = {};

    const resolver = new Resolver({
      name: () => 'Johnny Cash'
    });

    const result = await resolver.resolve(value);

    await assert.deepEqual(result, {
      name: 'Johnny Cash'
    });
  });

  it('Resolves an async function in `resolve`', async () => {
    const value = { name: 'Johnny Cash' };

    const resolver = new Resolver({
      name: async () => 'Johnny Cash'
    });

    const result = await resolver.resolve(value);

    await assert.deepEqual(result, {
      name: 'Johnny Cash'
    });
  });

  it('Resolves sync and async functions in `resolve`', async () => {
    const value = { name: 'Johnny Cash' };

    const resolver = new Resolver({
      name: async () => 'Johnny Cash',
      genre: () => 'Country',
    });

    const result = await resolver.resolve(value);

    await assert.deepEqual(result, {
      name: 'Johnny Cash',
      genre: 'Country'
    });
  });

  it('Removes a property in `resolve`', async () => {
    const value = {
      name: 'Johnny Cash',
      genre: 'Country',
      guitar: true
    };

    const resolver = new Resolver({
      genre: async () => undefined,
      guitar: () => undefined,
    });

    const result = await resolver.resolve(value);

    await assert.deepEqual(result, {
      name: 'Johnny Cash'
    });
  });

  it('Uses the PropertyResolver', async () => {
    const value = {};

    const resolver = new Resolver({
      firstName: async () => 'Johnny',
      lastName: () => 'Cash',
      fullName: async function (data) {
        const firstName = await this.resolve('firstName');
        const lastName = this.resolve('lastName');
        return `${firstName} ${lastName}`
      }
    });

    const result = await resolver.resolve(value);

    await assert.deepEqual(result, {
      firstName: 'Johnny',
      lastName: 'Cash',
      fullName: 'Johnny Cash'
    });
  });

  it('Resolves an array of values', async () => {
    const value = [{}, {}];

    const resolver = new Resolver({
      name: async () => 'Johnny Cash'
    });

    const result = await resolver.resolve(value);

    await assert.deepEqual(result, [
      { name: 'Johnny Cash' },
      { name: 'Johnny Cash' },
    ]);
  });
});
