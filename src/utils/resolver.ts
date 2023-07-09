import toposort from 'toposort';
import { isPromise } from './utils';

export class Resolver {
  resolvers: Record<string, Promise<any>>;

  constructor(resolvers: Record<string, Promise<any>>) {
    this.resolvers = { ...resolvers };
  }

  _resolve(values, context, next) {
    const resolverCache: Record<string, Promise<any>> = {};
    const resolverEdges: Array<[string, string]> = [];
    const result = { ...values };
    const { resolvers } = this;
    const keys = Object.keys(resolvers);
    let count = keys.length;

    // Lazily resolve resolvers. This is fundamental
    // to the ref() method. Note we do not actually
    // use toposort to sort resolvers into a legal
    // execution order. That is handled by this
    // resolverCache.
    function resolve(key: string) {
      if (resolverCache[key]) {
        return resolverCache[key];
      }

      resolverCache[key] = resolvers[key].call(
        new PropertyResolver(key),
        values,
        context
      );

      return resolverCache[key];
    }

    // We may want to add this as an option to the
    // parent Schema, so a user could pass in there
    // own Resolver class with their own methods. Or
    // maybe instead of Resolver class, we use
    // a new instance of the Schema class with
    // this.ref method attached/scoped to this resolve.
    function PropertyResolver(parentKey: string) {
      // Await another resolver to finish and use its
      // value in this resolver. toposort ensures
      // no cyclical deps. We don't actually sort
      // anything or try to execute in any order.
      this.resolve = (key: string) => {
        resolverEdges.push([parentKey, key]);

        try {
          toposort(resolverEdges);
        } catch (error) {
          // TODO: Use a feathers error
          throw new Error(error.message);
        }

        return resolve(key);
      };

      // this.someOtherHelper = () => {};
    }

    if (!count) {
      return next(null, result);
    }

    const done = (key, value) => {
      --count;

      if (typeof value === 'undefined') {
        delete result[key];
      } else {
        result[key] = value;
      }

      if (count <= 0) {
        next(null, result);
      }
    };

    for (let index = 0; index < keys.length; index++) {
      try {
        const key = keys[index];
        const resolved = resolve(key);

        if (isPromise(resolved)) {
          Promise.resolve(resolved)
            .then((value) => done(key, value))
            .catch((error) => next(error));
        } else {
          done(key, resolved);
        }
      } catch (error) {
        next(error);
      }
    }
  }

  _resolveMany(valuesArray: any[], context?: any, next) {
    let count = valuesArray.length;
    const resultArray = [];

    const done = (index, result) => {
      --count;
      resultArray[index] = result;
      if (count <= 0) {
        next(null, resultArray);
      }
    };

    for (let index = 0; index < valuesArray.length; index++) {
      try {
        const values = valuesArray[index];
        this._resolve(values, context, (error, result) => {
          if (error) {
            next(error);
          } else {
            done(index, result);
          }
        });
      } catch (error) {
        next(error);
      }
    }
  }

  resolve(values: any | any[], context?: any) {
    return new Promise((resolve, reject) => {
      if (Array.isArray(values)) {
        this._resolveMany(values, context, (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        });
      } else {
        this._resolve(values, context, (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        });
      }
    });
  }
}
