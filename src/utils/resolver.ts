import type { HookContext } from '@feathersjs/feathers';
import { GeneralError } from '@feathersjs/errors';
import toposort from "toposort";
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

  resolve(data, context, callback) {
    const { resolvers } = this.options;

    if (isEmpty(resolvers)) {
      return callback(data);
    }

    const propertyResolver = new PropertyResolver({
      data,
      context,
      resolvers
    });

    const result = { ...data };
    const keys = Object.keys(resolvers);
    let done = 0

    const handleDone = (key, value) => {
      done++
      if (value !== undefined) {
        result[key] = value;
      }
      if (done === keys.length) {
        callback(result);
      }
    }

    keys.forEach((key) => {
      const resolved = propertyResolver.resolve(key);
      if (isPromise(resolved)) {
        resolved.then((value) => handleDone(key, value));
        return;
      }
      handleDone(key, resolved)
    });
  }
}

class PropertyResolver {
  options: {
    data: Record<string, any>;
    context: HookContext;
    resolvers: ResolverFunctions;
    cache: Record<string, Promise<any>>;
    edges: Array<[string, string]>,
    key: string | null;
  }

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
      return data[key];
    }

    const cached = cache[key];

    if (cached) {
      return cached;
    }

    if (parentKey) {
      edges.push([parentKey, key]);
      try {
        toposort(edges);
      } catch (error) {
        throw new GeneralError(error.message);
      }
    }

    const propertyResolver = new PropertyResolver({ ...this.options, key });

    const resolved = resolver(data, context, propertyResolver);

    cache[key] = resolved;

    return resolved;
  }
}