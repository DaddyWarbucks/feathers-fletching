import type { HookContext } from '@feathersjs/feathers';
import { GeneralError } from '@feathersjs/errors';
import toposort from 'toposort';
import getValue from 'get-value';
import objectId from 'bson-objectid';
import { isEmpty, isPromise, pick as pickValue } from './utils';

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
      throw new GeneralError(`Resolver" ${error.message}`);
    }

    const propertyResolver = parentKey
      ? this
      : new PropertyResolver({ ...this.options, key });

    const resolved = resolver(data, context, propertyResolver);

    cache[key] = resolved;

    return resolved;
  }
}

export type ResolverFactoryFunction = (
  value: any,
  data: Record<string, any>,
  context: HookContext,
  resolver: PropertyResolver
) => any;

const BREAK = Symbol('BREAK');

function sum(value, path) {
  if (!Array.isArray(value)) {
    throw new GeneralError(
      `Resolver: Cannot call array resolver method on a non-array value "${value}"`
    );
  }
  return value.reduce((total, item) => {
    const itemValue = getValue(item, path);
    if (typeof itemValue !== 'number') {
      return total;
    }
    return total + itemValue;
  }, 0);
}

function resolver(path) {
  function resolver(data, context, propertyResolver) {
    const result = this.execute(data, context, propertyResolver);

    if (isPromise(result)) {
      return result.then((resolved) => {
        return resolved;
      });
    }
    return result;
  }

  const options = {
    path,
    resolvers: [],
    selects: []
  };

  resolver.options = options;

  resolver.required = (path: string | string[] | ResolverFactoryFunction) => {
    function required(value, data, context, propertyResolver) {
      if (typeof path === 'function') {
        const requiredValue = path(value, data, context, propertyResolver);

        if (isPromise(requiredValue)) {
          return requiredValue.then((resolvedValue) => {
            return !!resolvedValue ? value : BREAK;
          });
        }

        return !!requiredValue ? value : BREAK;
      }

      if (Array.isArray(path)) {
        const requiredValue = path.every((path) => {
          return !!getValue({ data, context }, path);
        });

        return !!requiredValue ? value : BREAK;
      }

      const requiredValue = !!getValue({ data, context }, path);

      return !!requiredValue ? value : BREAK;
    }

    options.resolvers.push(required);
    return resolver;
  };

  resolver.set = (path: string) => {
    function set(value, data, context) {
      return getValue({ data, context }, path);
    }
    options.resolvers.push(set);
    return resolver;
  };

  resolver.strip = () => {
    function strip() {
      return undefined;
    }
    function stripBreak() {
      return BREAK;
    }
    options.resolvers.push(strip, stripBreak);
    return resolver;
  };

  resolver.default = (path: string | ResolverFactoryFunction) => {
    function defaultValue(value, data, context, propertyResolver) {
      if (![undefined, ''].includes(value)) {
        return value;
      }
      if (typeof path === 'function') {
        return path(value, data, context, propertyResolver);
      }
      return getValue({ data, context }, path);
    }
    options.resolvers.push(defaultValue);
    return resolver;
  };

  resolver.select = (paths: string[]) => {
    function select(value) {
      return pickValue(value, ...paths);
    }
    options.resolvers.push(select);
    options.selects = paths;
    return resolver;
  };

  resolver.string = () => {
    function string(value) {
      if (value.toString) {
        return value.toString();
      }
      return String(value);
    }
    options.resolvers.push(string);
    return resolver;
  };

  resolver.objectId = () => {
    function mongoId(value) {
      return objectId(value);
    }
    options.resolvers.push(mongoId);
    return resolver;
  };

  resolver.number = () => {
    function number(value) {
      return Number(value);
    }
    options.resolvers.push(number);
    return resolver;
  };

  resolver.average = (path: string) => {
    function average(value) {
      return sum(value, path) / value.length;
    }
    options.resolvers.push(average);
    return resolver;
  };

  resolver.sum = (path: string) => {
    function _sum(value) {
      return sum(value, path);
    }
    options.resolvers.push(_sum);
    return resolver;
  };

  resolver.round = (type?: 'ceil' | 'floor') => {
    function round(value) {
      if (type === 'ceil') {
        return Math.ceil(Number(value));
      }
      if (type === 'floor') {
        return Math.floor(Number(value));
      }
      return Math.round(Number(value));
    }
    options.resolvers.push(round);
    return resolver;
  };

  resolver.date = () => {
    function date(value) {
      return new Date(value);
    }
    options.resolvers.push(date);
    return resolver;
  };

  resolver.trim = () => {
    function trim(value) {
      return String(value).trim();
    }
    options.resolvers.push(trim);
    return resolver;
  };

  resolver.uppercase = () => {
    function uppercase(value) {
      return String(value).toUpperCase();
    }
    options.resolvers.push(uppercase);
    return resolver;
  };

  resolver.lowercase = () => {
    function lowercase(value) {
      return String(value).toLowerCase();
    }
    options.resolvers.push(lowercase);
    return resolver;
  };

  resolver.replace = (pattern, replacement) => {
    function replace(value) {
      return String(value).replace(pattern, replacement);
    }
    options.resolvers.push(replace);
    return resolver;
  };

  resolver.replaceAll = (pattern, replacement) => {
    function replaceAll(value) {
      return String(value).replaceAll(pattern, replacement);
    }
    options.resolvers.push(replaceAll);
    return resolver;
  };

  resolver.format = (
    type: 'date' | 'number',
    settings?: Record<string, any> | ResolverFactoryFunction | any
  ) => {
    const numberFormatterCache = new WeakMap();
    const dateFormatterCache = new WeakMap();

    const defaultSettings = {
      locale: undefined
    };

    const getFormatter = (type, settings?) => {
      settings = settings || defaultSettings;
      if (type === 'number') {
        let formatter = numberFormatterCache.get(settings);
        if (!formatter) {
          const { locale, ...config } = settings;
          formatter = new Intl.NumberFormat(locale, config);
          numberFormatterCache.set(settings, formatter);
          return formatter;
        }
      }
      if (type === 'date') {
        let formatter = dateFormatterCache.get(settings);
        if (!formatter) {
          const { locale, ...config } = settings;
          formatter = new Intl.DateTimeFormat(locale, config);
          dateFormatterCache.set(settings, formatter);
          return formatter;
        }
      }
    };

    function format(value, data, context, propertyResolver) {
      if (!value) {
        return value;
      }

      value = type === 'date' ? new Date(value) : Number(value);

      if (typeof settings === 'function') {
        settings = settings(value, data, context, propertyResolver);
        if (isPromise(settings)) {
          return settings.then((resolvedSettings) => {
            return getFormatter(type, resolvedSettings).format(value);
          });
        }
        return getFormatter(type, settings).format(value);
      }

      return getFormatter(type, settings).format(value);
    }

    options.resolvers.push(format);
    return resolver;
  };

  resolver.find = (service: string, params?: ResolverFactoryFunction | any) => {
    function findParams(params) {
      return {
        paginate: false,
        ...params
      };
    }

    function findResults(result) {
      if (result.data) {
        return result.data;
      }
      return result;
    }

    function find(value, data, context, propertyResolver) {
      if (!params) {
        return context.app
          .service(service)
          .find(findParams(context.params))
          .then(findResults);
      }

      if (typeof params === 'function') {
        const callbackParams = params(value, data, context, propertyResolver);

        if (isPromise(callbackParams)) {
          return callbackParams.then((resolvedParams) => {
            return context.app
              .service(service)
              .find(findParams(resolvedParams))
              .then(findResults);
          });
        }

        return context.app
          .service(service)
          .find(findParams(callbackParams))
          .then(findResults);
      }

      return context.app
        .service(service)
        .find(findParams(params))
        .then(findResults);
    }

    options.resolvers.push(find);
    return resolver;
  };

  resolver.findOne = (
    service: string,
    params?: ResolverFactoryFunction | any
  ) => {
    function findParams(params) {
      return {
        ...params,
        paginate: false,
        query: { ...params.query, $limit: 1 }
      };
    }

    function findResults(result) {
      if (result.data) {
        return result.data[0] || null;
      }
      return result[0] || null;
    }

    async function findOne(value, data, context, propertyResolver) {
      if (!params) {
        return context.app
          .service(service)
          .find(findParams(context.params))
          .then(findResults);
      }

      if (typeof params === 'function') {
        const callbackParams = params(value, data, context, propertyResolver);

        if (isPromise(callbackParams)) {
          return callbackParams.then(async (resolvedParams) => {
            return context.app
              .service(service)
              .find(findParams(resolvedParams))
              .then(findResults);
          });
        }

        return context.app
          .service(service)
          .find(findParams(callbackParams))
          .then(findResults);
      }

      return context.app
        .service(service)
        .find(findParams(params))
        .then(findResults);
    }

    options.resolvers.push(findOne);
    return resolver;
  };

  resolver.get = (
    service: string,
    id: string,
    params?: ResolverFactoryFunction | any
  ) => {
    function get(value, data, context, propertyResolver) {
      id = getValue({ data, context }, id);

      if (typeof params === 'function') {
        const callbackParams = params(value, data, context, propertyResolver);

        if (isPromise(callbackParams)) {
          return callbackParams.then((resolvedParams) => {
            return context.app.service(service).get(id, resolvedParams);
          });
        }

        return context.app.service(service).get(id, callbackParams);
      }

      return context.app.service(service).get(id, params);
    }

    options.resolvers.push(get);
    return resolver;
  };

  resolver.count = (
    service: string,
    params?: ResolverFactoryFunction | any
  ) => {
    function findParams(params) {
      return {
        ...params,
        paginate: true,
        query: { ...params.query, $limit: 0 }
      };
    }

    function findResults(result) {
      return result.total;
    }

    function count(value, data, context, propertyResolver) {
      if (!params) {
        return context.app
          .service(service)
          .find(findParams(context.params))
          .then(findResults);
      }

      if (typeof params === 'function') {
        const callbackParams = params(value, data, context, propertyResolver);

        if (isPromise(callbackParams)) {
          return callbackParams.then(async (resolvedParams) => {
            return context.app
              .service(service)
              .find(findParams(resolvedParams))
              .then(findResults);
          });
        }

        return context.app
          .service(service)
          .find(findParams(callbackParams))
          .then(findResults);
      }

      return context.app
        .service(service)
        .find(findParams(params))
        .then(findResults);
    }

    options.resolvers.push(count);
    return resolver;
  };

  resolver.load = (
    service: string,
    id: string,
    params?: ResolverFactoryFunction | any
  ) => {
    function load(value, data, context, propertyResolver) {
      if (!context.params.loader?.service) {
        throw new GeneralError(
          'Resolver: Cannot call loader method without a "context.params.loader" being a "feathers-loader" instance'
        );
      }

      id = getValue({ data, context }, id);

      if (!id) {
        return null;
      }

      const loader = context.params.loader.service(service);

      if (typeof params === 'function') {
        const callbackParams = params(value, data, context, propertyResolver);

        if (isPromise(callbackParams)) {
          return callbackParams.then(async (resolvedParams) => {
            return loader.load(id, resolvedParams);
          });
        }

        return loader.load(id, callbackParams);
      }

      return loader.load(id, params);
    }

    options.resolvers.push(load);
    return resolver;
  };

  resolver.resolve = (_resolver) => {
    options.resolvers.push(_resolver);
    return resolver;
  };

  resolver.addMethod = (name, method) => {
    resolver[name] = (...args) => {
      const resolver = method(...args);
      options.resolvers.push(resolver);
      return resolver;
    };
    return resolver;
  };

  resolver.execute = (data, context, propertyResolver) => {
    const { path, resolvers } = options;

    let value = getValue(data, path);
    let index = 0;
    let promise = null;

    for (; index < resolvers.length; index++) {
      const current = resolvers[index];
      const resolved = current(value, data, context, propertyResolver);
      if (resolved === BREAK) {
        break;
      }
      if (isPromise(resolved)) {
        promise = resolved;
        break;
      }
      value = resolved;
    }

    if (!promise) {
      return value;
    }

    return new Promise((resolve, reject) => {
      promise
        .then(async (resolvedValue) => {
          if (resolvedValue === BREAK) {
            return resolve(value);
          }
          value = resolvedValue;
          for (; index < resolvers.length; index++) {
            const current = resolvers[index];
            const resolved = current(value, data, context, propertyResolver);
            if (isPromise(resolved)) {
              const resolvedValue = await resolved.then((value) => value);
              if (resolvedValue === BREAK) {
                return resolve(value);
              }
              value = resolvedValue;
            }
            if (resolved === BREAK) {
              return resolve(value);
            }
            value = resolved;
          }
          resolve(value);
        })
        .catch(reject);
    });
  };

  return resolver;
}

const resolvers = {
  _id: resolver('_id').objectId(),
  user: resolver('user')
    .select(['data.userId'])
    .provider(null)
    .provider(['socket.io', 'rest'])
    .method('find')
    .method(['find', 'get'])
    .required(['context.params.user.isAdmin', 'context.params.user.orgId'])
    .required((value, data, context) => {
      return context.params.user.isAdmin || context.params.user.orgId;
    })
    .get('api/users', 'data.userId', { query: { $select: ['name'] } })
    .load('api/users', 'data.userId', { query: { $select: ['name'] } }),
  coAuthor: resolver('coAuthor').load('api/services', 'data.coAuthorId'),
  comments: resolver('comments')
    .required('context.params.user.isAdmin')
    .set('data.commentIds')
    .resolve((value, data, context) => {
      context.params.loader.service('comments').load(value);
    })
    .resolve((value, data, context) => {
      context.params.loader.service('comments').load(data.commentIds);
    })
    .select(['commentIds'])
    .find('api/ratings')
    .find('api/comments', (value, data) => {
      return { query: { _id: { $in: data.commentIds } } };
    }),
  fullName: resolver('fullName')
    .resolve((value) => `${value.firstName} ${value.lastName}`)
    .replaceAll('  ', ' ')
    .uppercase(),
  previewedAt: resolver('previewedAt')
    .set('context.params.user.lastLogin')
    .format('date'),
  averagePrice: resolver('averagePrice')
    .set('data.charges')
    .average('price')
    .round(),
  totalPrice: resolver('totalPrice')
    .set('data.charges')
    .sum('price')
    .round()
    .format('number', { style: 'currency', currency: 'USD' }),
  totalComments: resolver('totalComments').
};

function selectHook(resolvers: Record<string, any>) {
  return (context) => {
    if (isEmpty(context.params.query?.$select)) {
      return context;
    }

    let selected = [...context.params.query.$select];
    const selectedResolvers = [];

    Object.values(resolvers).forEach((resolver) => {
      if (!resolver.options) {
        return;
      }

      const { path, selects } = resolver.options;

      if (selected.includes(path)) {
        selectedResolvers.push(path);
        selected.push(...selects);
      }
    });

    selected = selected.filter((path, index, self) => {
      if (selectedResolvers.includes(path)) {
        return false;
      }
      return self.indexOf(path) === index;
    });

    context.params.query.$select = selected;

    return context;
  };
}
