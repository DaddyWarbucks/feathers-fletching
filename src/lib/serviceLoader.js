const BatchLoader = require('@feathers-plus/batch-loader');
const { isObject, stableStringify } = require('./utils');

module.exports = class ServiceLoader {
  constructor(service, loaderOptions = {}) {
    this.service = service;
    this.loaderOptions = loaderOptions;
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
      createLoader({
        idProp,
        params: { ...params, ...extraParams },
        resultType: '!',
        service: this.service,
        loaderOptions: this.loaderOptions
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
      createLoader({
        idProp,
        params: { ...params, ...extraParams },
        resultType: '[!]',
        service: this.service,
        loaderOptions: this.loaderOptions
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
    if (!id) {
      this.getCache.clear();
      return;
    }

    this.getCache.forEach((value, key) => {
      const [_id, _params] = JSON.parse(key);
      if (id === _id) {
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
      const [_params] = JSON.parse(key);
      if (stableStringify(params) === stableStringify(_params)) {
        this.findCache.delete(key);
      }
    });
  }
};

const createLoader = ({
  idProp,
  service,
  resultType,
  params = {},
  loaderOptions = {}
}) => {
  if (!service.find) {
    throw new Error(
      'Cannot create a loder for a service that does not have a find method.'
    );
  }

  return new BatchLoader(
    async keys => {
      return service
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
    },
    {
      cacheKeyFn: key => (key.toString ? key.toString() : key),
      ...loaderOptions
    }
  );
};

const getIdOptions = (idObj, defaultProp) => {
  if (isObject(idObj)) {
    const entries = Object.entries(idObj);

    if (entries.length !== 1) {
      throw new Error(
        'When using an object as an it must have exactly one key representing the id property like { id: "123" }'
      );
    }

    return entries[0];
  }

  return [defaultProp, idObj];
};
