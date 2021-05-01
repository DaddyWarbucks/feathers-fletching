const BatchLoader = require('@feathers-plus/batch-loader');
const { isObject, stableStringify } = require('./utils');

module.exports = class ServiceLoader {
  constructor(service, loaderOptions = {}) {
    this.service = service;
    this.loaderOptions = {
      ...loaderOptions,
      cacheKeyFn: key => (key.toString ? key.toString() : String(key))
    };
    this.getCache = new Map();
    this.findCache = new Map();
    this.loadCache = new Map();
    this.loadManyCache = new Map();
  }

  load(idObject, params, extraParams) {
    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const key = stableStringify([idProp, params]);
    const cached =
      this.loadCache.get(key) ||
      this.createLoader({
        idProp,
        params: { ...params, ...extraParams },
        resultType: '!'
      });

    this.loadCache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  clearLoad(idObject, params) {
    if (!idObject) {
      this.loadCache.forEach(loader => loader.clearAll());
      return;
    }

    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

    this.loadCache.forEach((loader, key) => {
      const [_idProp, _params] = JSON.parse(key);
      if (idProp === _idProp) {
        if (!params) {
          keys.forEach(key => loader.clear(key));
        }
        if (stableStringify(params) === stableStringify(_params)) {
          keys.forEach(key => loader.clear(key));
        }
      }
    });
  }

  loadMany(idObject, params, extraParams) {
    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const key = stableStringify([idProp, params]);
    const cached =
      this.loadManyCache.get(key) ||
      this.createLoader({
        idProp,
        params: { ...params, ...extraParams },
        resultType: '[!]'
      });

    this.loadManyCache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  clearLoadMany(idObject, params) {
    if (!idObject) {
      this.loadManyCache.forEach(loader => loader.clearAll());
      return;
    }

    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

    this.loadManyCache.forEach((loader, key) => {
      const [_idProp, _params] = JSON.parse(key);
      if (idProp === _idProp) {
        if (!params) {
          keys.forEach(key => loader.clear(key));
        }
        if (stableStringify(params) === stableStringify(_params)) {
          keys.forEach(key => loader.clear(key));
        }
      }
    });
  }

  get(id, params, extraParams) {
    const key = stableStringify([id, params]);
    const cached =
      this.getCache.get(key) ||
      this.service.get(id, {
        ...params,
        ...extraParams
      });

    this.getCache.set(key, cached);

    return cached;
  }

  clearGet(id, params) {
    const { cacheKeyFn } = this.loaderOptions;

    if (!id) {
      this.getCache.clear();
      return;
    }

    this.getCache.forEach((value, key) => {
      const [_id, _params] = JSON.parse(key);
      if (cacheKeyFn(id) === cacheKeyFn(_id)) {
        if (!params) {
          this.getCache.delete(key);
        }
        if (stableStringify(params) === stableStringify(_params)) {
          this.getCache.delete(key);
        }
      }
    });
  }

  find(params, extraParams) {
    const key = stableStringify([params]);
    const cached =
      this.findCache.get(key) ||
      this.service.find({
        ...params,
        ...extraParams
      });

    this.findCache.set(key, cached);

    return cached;
  }

  clearFind(params) {
    if (!params) {
      this.findCache.clear();
      return;
    }

    this.findCache.forEach((value, key) => {
      if (stableStringify([params]) === key) {
        this.findCache.delete(key);
      }
    });
  }

  createLoader({ idProp, resultType, params = {} }) {
    if (!this.service.find) {
      throw new Error(
        'Cannot create a loader for a service that does not have a find method.'
      );
    }

    return new BatchLoader(async keys => {
      return this.service
        .find({
          paginate: false,
          ...params,
          query: {
            ...params.query,
            [idProp]: { $in: BatchLoader.getUniqueKeys(keys) }
          }
        })
        .then(result => {
          return BatchLoader.getResultsByKey(
            keys,
            result.data ? result.data : result,
            idProp,
            resultType
          );
        });
    }, this.loaderOptions);
  }
};

const getIdOptions = (idObj, defaultProp) => {
  if (isObject(idObj)) {
    const entries = Object.entries(idObj);

    if (entries.length !== 1) {
      throw new Error(
        'When using an object as an id, the object must have exactly one property where the property name is the name of the foreign key. For example, { post_id: "123" } or { post_id: ["123", "456"] }'
      );
    }

    return entries[0];
  }

  return [defaultProp, idObj];
};
