import type { HookContext } from '@feathersjs/feathers';
import { GeneralError } from '@feathersjs/errors';
import toposort from 'toposort';
import { isEmpty, isPromise } from './utils';

export type ResolverFunction = (
  data: Record<string, any>,
  context: HookContext,
  resolver: PropertyResolver
) => any;

export type ResolverFunctions = Record<string, ResolverFunction>;

export class Resolver {
  options: {
    resolvers: ResolverFunctions;
  };

  constructor(resolvers: ResolverFunctions) {
    this.options = { resolvers };
  }

  resolve(data, context) {
    const { resolvers } = this.options;

    if (isEmpty(resolvers)) {
      return data;
    }

    data = { ...data };
    const keys = Object.keys(resolvers);
    const propertyResolver = new PropertyResolver({
      data,
      context,
      resolvers
    });

    return new Promise((resolve, reject) => {
      try {
        keys.forEach((key, index) => {
          Callback.resolve(
            () => propertyResolver.resolve(key),
            (resolved) => {
              if (resolved === undefined) {
                delete data[key];
              } else {
                data[key] = resolved;
              }
              if (index === keys.length - 1) {
                resolve(data);
              }
            },
            (error) => reject(error)
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async resolvePromise(data, context) {
    const { resolvers } = this.options;

    if (isEmpty(resolvers)) {
      return data;
    }

    data = { ...data };
    const keys = Object.keys(resolvers);
    const propertyResolver = new PropertyResolver({
      data,
      context,
      resolvers
    });

    await Promise.all(
      keys.map(async (key) => {
        const resolved = await propertyResolver.resolve(key);
        if (resolved === undefined) {
          delete data[key];
        } else {
          data[key] = resolved;
        }
      })
    );

    return data;
  }
}

export const Callback = {
  resolve: function (callback, resolve, reject) {
    try {
      const maybePromise = callback();
      if (isPromise(maybePromise)) {
        maybePromise.then(resolve).catch(reject);
        return;
      }
      resolve(maybePromise);
    } catch (error) {
      reject(error);
    }
  }
};

class PropertyResolver {
  options: {
    data: Record<string, any>;
    context: HookContext;
    resolvers: ResolverFunctions;
    cache: Record<string, Promise<any>>;
    edges: Array<[string, string]>;
    key: string | null;
  };

  constructor(options) {
    this.options = {
      cache: {},
      edges: [],
      key: null,
      ...options
    };
  }

  resolve(key) {
    const {
      data,
      context,
      resolvers,
      cache,
      edges,
      key: parentKey
    } = this.options;

    const resolver = resolvers[key];

    if (!resolver) {
      return undefined;
    }

    const cached = cache[key];

    if (cached) {
      return cached;
    }

    if (parentKey) {
      edges.push([parentKey, key]);
    }

    try {
      toposort(edges);
    } catch (error) {
      throw new GeneralError(error.message);
    }

    const propertyResolver = parentKey
      ? this
      : new PropertyResolver({ ...this.options, key });

    const resolved = resolver(data, context, propertyResolver);

    cache[key] = resolved;

    return resolved;
  }
}
