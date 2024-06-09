import type { HookContext } from '@feathersjs/feathers';
import type { MaybeArray, Promisable } from './utils';
import { isEmpty, isPromise } from './utils';

// type ResolverFn = typeof resolver;

export type ResolverFunction = (
  data: Record<string, any>,
  context: HookContext,
  resolvers: Record<string, any>
) => any;

export type ResolverFunctions = Record<string, ResolverFunction>;

interface Resolver {
  options: {
    resolvers: ResolverFunctions;
  };
}

class Resolver {
  constructor(resolvers: ResolverFunctions) {
    // this.data = data;
    // this.result = { ...data };
    this.options = { resolvers };
  }

  resolve(data, context) {
    if (isEmpty(this.options.resolvers)) {
      return data;
    }

    const results = { ...data };

    const resolver = new PropertyResolver(result, resolvers);

    Object.entries(this.options.resolvers).forEach(([key, resolver]) => {
      const resolved = resolver(data, context, results);
    });
  }
}

// function callbackPromises(maybePromise, callback) {
//   if (isPromise(maybePromise)) {
//     return maybePromise.then(callback);
//   }

//   return callback(maybePromise);
// }

class PropertyResolver {
  constructor(result, any, resolvers: ResolverFunctions) {
    // this.data = data;
    // this.result = { ...data };
    this.options = { resolvers };
  }

  resolve(data) { }
}
