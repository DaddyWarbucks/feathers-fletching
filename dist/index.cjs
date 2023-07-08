'use strict';

const errors = require('@feathersjs/errors');
const lruCache = require('lru-cache');
const unset = require('unset-value');
const qs = require('qs');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const unset__default = /*#__PURE__*/_interopDefaultCompat(unset);
const qs__default = /*#__PURE__*/_interopDefaultCompat(qs);

const skippable = (hookName, hookFunc) => {
  return (context) => {
    if (context.params && context.params.skipHooks) {
      const { skipHooks } = context.params;
      if (!Array.isArray(skipHooks)) {
        throw new errors.GeneralError(
          "The `skipHooks` param must be an Array of Strings"
        );
      }
      if (skipHooks.includes(hookName) || skipHooks.includes("all") || skipHooks.includes("before") && context.type === "before" || skipHooks.includes("after") && context.type === "after") {
        return context;
      } else {
        return hookFunc(context);
      }
    } else {
      return hookFunc(context);
    }
  };
};

const omit = (obj, keys) => {
  const result = Object.assign({}, obj);
  keys.forEach((key) => unset__default(result, key));
  return result;
};
const pick = (obj, keys) => keys.reduce((result, key) => {
  if (obj[key] !== void 0) {
    result[key] = obj[key];
  }
  return result;
}, {});
const isPromise = (maybePromise) => {
  const isPromise2 = maybePromise && typeof maybePromise.then === "function";
  return !!isPromise2;
};
const isObject = (obj) => {
  return obj && typeof obj === "object" && !Array.isArray(obj);
};
const isEmpty = (obj) => {
  if (Array.isArray(obj)) {
    return obj.length === 0;
  }
  return Object.keys(obj).length === 0;
};
const hasKey = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
const hasQuery = (context) => {
  const hasQuery2 = context.params && context.params.query && !isEmpty(context.params.query);
  return !!hasQuery2;
};
const getResults = (context) => {
  return context.method === "find" ? context.result.data || context.result : context.result;
};
const replaceResults = (context, results) => {
  if (context.method === "find") {
    if (context.result && context.result.data) {
      context.result.data = Array.isArray(results) ? results : [results];
    } else {
      context.result = Array.isArray(results) ? results : [results];
    }
  } else {
    context.result = results;
  }
};
const stableStringify = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "function") {
      throw new Error("Cannot stringify non JSON value");
    }
    if (isObject(value)) {
      return Object.keys(value).sort().reduce((result, key2) => {
        result[key2] = value[key2];
        return result;
      }, {});
    }
    return value;
  });
};
const traverse = (obj, callback) => {
  if (!isObject(obj)) {
    return obj;
  }
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((childObj) => traverse(childObj, callback));
    }
    if (isObject(value)) {
      traverse(value, callback);
    }
    return callback(obj, [key, value]);
  });
  return obj;
};
const asyncTraverse = async (obj, callback) => {
  if (!isObject(obj)) {
    return obj;
  }
  await Promise.all(
    Object.entries(obj).map(async ([key, value]) => {
      if (Array.isArray(value)) {
        await Promise.all(
          value.map((childObj) => asyncTraverse(childObj, callback))
        );
      }
      if (isObject(value)) {
        await asyncTraverse(value, callback);
      }
      return callback(obj, [key, value]);
    })
  );
  return obj;
};
const clone = (obj) => {
  if (typeof obj == "function") {
    return obj;
  }
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    const type = {}.toString.call(value).slice(8, -1);
    if (type == "Array" || type == "Object") {
      result[key] = clone(value);
    } else if (type == "Date") {
      result[key] = new Date(value.getTime());
    } else if (type == "RegExp") {
      result[key] = RegExp(value.source, getRegExpFlags(value));
    } else {
      result[key] = value;
    }
  }
  return result;
};
const getRegExpFlags = (regExp) => {
  if (typeof regExp.source.flags == "string") {
    return regExp.source.flags;
  } else {
    const flags = [];
    regExp.global && flags.push("g");
    regExp.ignoreCase && flags.push("i");
    regExp.multiline && flags.push("m");
    regExp.sticky && flags.push("y");
    regExp.unicode && flags.push("u");
    return flags.join("");
  }
};

class ContextCacheMap {
  constructor(options) {
    options ?? (options = { max: 100 });
    this.map = "map" in options ? options?.map : new lruCache.LRUCache(options);
  }
  makeCacheKey(context) {
    return stableStringify({
      method: context.method,
      id: context.id,
      query: context.params && context.params.query
    });
  }
  makeId(id) {
    return id.toString ? id.toString() : id;
  }
  makeResultId(record) {
    const id = record._id || record.id;
    return this.makeId(id);
  }
  cloneResult(context) {
    return JSON.parse(JSON.stringify(context.result));
  }
  // Called before get() and find()
  async get(context) {
    const key = this.makeCacheKey(context);
    return this.map.get(key);
  }
  // Called after get() and find()
  async set(context) {
    const key = this.makeCacheKey(context);
    const result = this.cloneResult(context);
    return this.map.set(key, result);
  }
  // Called after create(), update(), patch(), and remove()
  async clear(context) {
    const { result } = context;
    const results = Array.isArray(result) ? result : [result];
    results.forEach((result2) => {
      Array.from(this.map.keys()).forEach((key) => {
        const keyObj = JSON.parse(key);
        if (keyObj.method === "find") {
          return this.map.delete(key);
        } else {
          if (context.method !== "create") {
            const id = this.makeId(keyObj.id);
            const recordId = this.makeResultId(result2);
            if (id === recordId) {
              return this.map.delete(key);
            }
          }
        }
      });
    });
  }
}

const sanitize = (result, schema) => {
  if (result === null || result === void 0) {
    return result;
  }
  if (typeof result === "string") {
    return sanitizeString(result, schema);
  }
  if (typeof result === "number") {
    const string = result.toString();
    const replaced = sanitizeString(string, schema);
    const number = Number(replaced);
    if (isNaN(number)) {
      return replaced;
    } else {
      return number;
    }
  }
  if (Array.isArray(result)) {
    return result.map((item) => sanitize(item, schema));
  }
  if (result instanceof Error) {
    if ("hook" in result) {
      const { hook } = result;
      delete result.hook;
      const error = Object.getOwnPropertyNames(result).reduce(
        (sanitized, key) => {
          sanitized[key] = sanitize(result[key], schema);
          return sanitized;
        },
        result
      );
      error.hook = hook;
      return error;
    } else {
      return Object.getOwnPropertyNames(result).reduce((sanitized, key) => {
        sanitized[key] = sanitize(result[key], schema);
        return sanitized;
      }, result);
    }
  }
  if (typeof result === "object") {
    return Object.keys(result).reduce((sanitized, key) => {
      sanitized[key] = sanitize(result[key], schema);
      return sanitized;
    }, {});
  }
  return result;
};
const sanitizeString = (string, schema) => {
  return Object.keys(schema).reduce((sanitized, key) => {
    const val = schema[key];
    if (typeof val === "function") {
      return val(sanitized, key);
    } else {
      return sanitized.replace(key, val);
    }
  }, string);
};

const stndMethods = ["find", "get", "create", "update", "patch", "remove"];
const checkContext = (context, type = null, methods = [], label = "anonymous") => {
  if (type && context.type !== type) {
    throw new errors.GeneralError(
      `The '${label}' hook can only be used as a '${type}' hook.`
    );
  }
  if (!methods) {
    return;
  }
  if (stndMethods.indexOf(context.method) === -1) {
    return;
  }
  const myMethods = Array.isArray(methods) ? methods : [methods];
  if (myMethods.length > 0 && myMethods.indexOf(context.method) === -1) {
    const msg = JSON.stringify(myMethods);
    throw new errors.GeneralError(
      `The '${label}' hook can only be used on the '${msg}' service method(s).`
    );
  }
};

const resolver = (virtual, key, updated, context, prepResult) => {
  if (typeof virtual === "function") {
    const result = virtual(updated, context, prepResult);
    if (isPromise(result)) {
      return result.then((result2) => {
        if (typeof result2 !== "undefined") {
          updated[key] = result2;
        }
      });
    }
    if (typeof result !== "undefined") {
      updated[key] = result;
      return result;
    }
    return result;
  } else {
    updated[key] = virtual;
    return virtual;
  }
};
const filterResolver = (virtual, key, updated, context, prepResult) => {
  if (typeof virtual === "function") {
    const result = virtual(updated, context, prepResult);
    if (isPromise(result)) {
      return result.then((shouldKeep) => {
        if (!shouldKeep) {
          delete updated[key];
        }
      });
    } else {
      if (!result) {
        delete updated[key];
      }
      return result;
    }
  } else {
    if (!virtual) {
      delete updated[key];
    }
    return virtual;
  }
};
const serializer = async (item, virtuals, context, prepResult, resolver2) => {
  const updated = Object.assign({}, item);
  const syncKeys = [];
  const asyncKeys = [];
  Object.keys(virtuals).forEach((key) => {
    (key.startsWith("@") ? syncKeys : asyncKeys).push(key);
  });
  if (syncKeys.length) {
    for (const key of syncKeys) {
      const result = resolver2(
        virtuals[key],
        key.substring(1),
        updated,
        context,
        prepResult
      );
      if (isPromise(result)) {
        await result;
      }
    }
  }
  if (asyncKeys.length) {
    const results = asyncKeys.map((key) => {
      return resolver2(virtuals[key], key, updated, context, prepResult);
    });
    if (results.some((result) => isPromise(result))) {
      await Promise.all(results.filter((result) => isPromise(result)));
    }
  }
  return updated;
};
const virtualsSerializer = async (resolver2, data, virtuals, context, prepFunc = () => {
}) => {
  let prepResult = prepFunc(context);
  if (isPromise(prepResult)) {
    prepResult = await prepResult.then((result) => result);
  }
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(
        (item) => serializer(item, virtuals, context, prepResult, resolver2)
      )
    );
  }
  return serializer(data, virtuals, context, prepResult, resolver2);
};

const contextCache = (cacheMap) => skippable("contextCache", async (context) => {
  if (context.type === "before") {
    if (context.method === "get" || context.method === "find") {
      const value = await cacheMap.get(context);
      if (value) {
        context.result = value;
      }
    }
  } else {
    if (context.method === "get" || context.method === "find") {
      await cacheMap.set(context);
    } else {
      await cacheMap.clear(context);
    }
  }
  return context;
});

function makeOptionsWithDefaults(options) {
  return Object.keys(options).reduce((result, key) => {
    const option = options[key];
    result[key] = {
      overwrite: false,
      makeKey: (key2) => key2,
      makeParams: (defaultParams) => defaultParams,
      ...option
    };
    return result;
  }, {});
}
const joinQuery = (_options) => {
  const options = makeOptionsWithDefaults(_options);
  return skippable("joinQuery", async (context) => {
    if (context.type === "before") {
      if (!hasJoinQuery(context, options)) {
        return context;
      }
      const [query, joinSort2] = cleanJoinQuerySort(
        clone(context.params.query),
        options
      );
      context.joinSort = joinSort2;
      if (!isEmpty(joinSort2) && context.method === "find") {
        context.result = await findJoinQuerySort(
          query,
          joinSort2,
          context,
          options
        );
        return context;
      }
      context.params.query = await transformJoinQuery(query, context, options);
      return context;
    }
    if (!context.joinSort || isEmpty(context.joinSort)) {
      return context;
    }
    const { joinSort } = context;
    delete context.joinSort;
    if (context.method === "find") {
      return context;
    }
    if (context.method === "get" || context.method === "update" || context.id !== null) {
      return context;
    }
    context.result = await mutateJoinQuerySort(joinSort, context, options);
    return context;
  });
};
const hasJoinQuery = (context, options) => {
  if (!hasQuery(context)) {
    return false;
  }
  let has = false;
  traverse(context.params.query, (parent, [key, value]) => {
    if (isJoinQuery(key, options)) {
      has = true;
    }
  });
  return has;
};
const cleanJoinQuerySort = (query, options) => {
  if (!query.$sort) {
    return [query, {}];
  }
  const joinKeys = Object.keys(query.$sort).filter((key) => {
    return isJoinQuery(key, options);
  });
  const joinSort = pick(query.$sort, joinKeys);
  const cleanSort = omit(query.$sort, joinKeys);
  const cleanQuery = omit(query, ["$sort"]);
  if (!isEmpty(cleanSort)) {
    cleanQuery.$sort = cleanSort;
  }
  return [cleanQuery, joinSort];
};
const isJoinQuery = (key, options) => {
  const optionKey = key.split(".")[0];
  return !!options[optionKey];
};
const parseJoinQuery = (key) => {
  const [optionKey, ...rest] = key.split(".");
  const optionQuery = rest.join(".");
  return [optionKey, optionQuery];
};
const normalizeJoinQuery = (query, options) => {
  traverse(query, (parent, [key, value]) => {
    if (!isJoinQuery(key, options)) {
      return;
    }
    const [optionKey, optionQuery] = parseJoinQuery(key);
    if (optionQuery) {
      delete parent[key];
      parent[optionKey] = {
        ...parent[optionKey],
        [optionQuery]: value
      };
    } else {
      parent[optionKey] = {
        ...parent[optionKey],
        ...value
      };
    }
  });
  Object.entries(query).forEach(([rootKey, rootVal]) => {
    if (!isJoinQuery(rootKey, options)) {
      return;
    }
    const option = options[rootKey];
    if (option.overwrite === true) {
      return;
    }
    delete query[rootKey];
    query.$and = query.$and || [];
    query.$and.push({ [rootKey]: rootVal });
  });
  return query;
};
const transformJoinQuery = async (query, context, options) => {
  const normalizedQuery = normalizeJoinQuery(query, options);
  await asyncTraverse(normalizedQuery, async (parent, [key, value]) => {
    if (!isJoinQuery(key, options)) {
      return;
    }
    delete parent[key];
    const option = options[key];
    const defaultParams = {
      paginate: false,
      query: { $select: [option.targetKey], ...value }
    };
    const params = await option.makeParams(defaultParams, context, option);
    const result = await context.app.service(option.service).find(params);
    parent[option.foreignKey] = {
      $in: makeForeignKeys(result.data || result, option)
    };
    return parent;
  });
  return query;
};
const findJoinQuerySort = async (query, joinSort, context, options) => {
  const transformedJoinQuery = await transformJoinQuery(
    query,
    context,
    options
  );
  const findResults = context.service.find({
    paginate: false,
    query: transformedJoinQuery
  });
  const [allResults, ...foreignKeyGroups] = await Promise.all([
    findResults,
    ...forignKeyPromises(joinSort, context, options)
  ]);
  const sortedResults = sortResults(
    joinSort,
    options,
    foreignKeyGroups,
    allResults
  );
  const paginatedResults = paginateResults(context, sortedResults);
  return paginatedResults;
};
const mutateJoinQuerySort = async (joinSort, context, options) => {
  const foreignKeyGroups = await Promise.all(
    forignKeyPromises(joinSort, context, options)
  );
  const sortedResults = sortResults(
    joinSort,
    options,
    foreignKeyGroups,
    context.result
  );
  return sortedResults;
};
const forignKeyPromises = (joinSort, context, options) => {
  return Object.entries(joinSort).map(async ([key, value]) => {
    const [optionKey, optionQuery] = parseJoinQuery(key);
    const { service, targetKey } = options[optionKey];
    return await context.app.service(service).find({
      paginate: false,
      query: { $select: [targetKey], $sort: { [optionQuery]: value } }
    });
  });
};
const sortResults = (joinSort, options, foreignKeyGroups, results) => {
  const sortedResults = [...results];
  foreignKeyGroups.forEach((foreignKeys, index) => {
    const [optionKey] = parseJoinQuery(Object.keys(joinSort)[index]);
    const { makeKey, foreignKey, targetKey } = options[optionKey];
    const fKeys = foreignKeys.map((item) => makeKey(item[targetKey]));
    sortedResults.sort((a, b) => {
      const aKey = makeKey(a[foreignKey]);
      const bKey = makeKey(b[foreignKey]);
      return fKeys.indexOf(aKey) - fKeys.indexOf(bKey);
    });
  });
  return sortedResults;
};
const paginateResults = (context, results) => {
  const ctx = { ...context };
  const pagination = ctx.service.options && ctx.service.options.paginate;
  const paginate = ctx.params && ctx.params.paginate;
  const query = ctx.params && ctx.params.query;
  const hasLimit = query && hasKey(query, "$limit");
  const limit = query && query.$limit;
  const skip = query && query.$skip || 0;
  const total = results.length;
  const result = {
    skip,
    limit,
    total
  };
  if (!pagination || paginate === false) {
    if (!hasLimit) {
      return results;
    }
    if (limit === -1) {
      return [];
    }
    return results.slice(skip);
  }
  if (!hasLimit) {
    return {
      ...result,
      data: results.slice(skip, pagination.default + 1)
    };
  }
  if (limit === -1) {
    return {
      ...result,
      data: []
    };
  }
  if (query.$limit > pagination.max) {
    return {
      ...result,
      data: results.slice(skip, pagination.max + 1)
    };
  }
  return {
    ...result,
    data: results.slice(skip, limit + 1)
  };
};
const makeForeignKeys = (result, { makeKey, targetKey }) => {
  return result.map((result2) => makeKey(result2[targetKey])).filter((key, index, self) => key && self.indexOf(key) === index);
};

const jsonQueryStringify = (options = {
  overwrite: true,
  propName: "json"
}) => {
  return skippable("jsonQueryStringify", (context) => {
    checkContext(context, "before", null, "jsonQueryStringify");
    const { query } = context.params;
    if (!query) {
      return context;
    }
    const { overwrite, propName } = Object.assign(
      {},
      options,
      context.params.jsonQueryStringify || {}
    );
    if (overwrite) {
      context.params.query = { [propName]: JSON.stringify(query) };
    } else {
      context.params.query[propName] = JSON.stringify(query);
    }
    return context;
  });
};
const jsonQueryParse = (options = {
  overwrite: true,
  propName: "json"
}) => {
  return skippable("jsonQueryParse", (context) => {
    checkContext(context, "before", null, "jsonQueryParse");
    const { query } = context.params;
    if (!query) {
      return context;
    }
    const { overwrite, propName } = Object.assign(
      {},
      options,
      context.params.jsonQueryParse
    );
    if (overwrite) {
      context.params.query = JSON.parse(query[propName]);
    } else {
      context.params.query[propName] = JSON.parse(query[propName]);
    }
    return context;
  });
};
const jsonQueryClient = (app) => {
  Object.values(app.services).forEach((service) => {
    service.hooks({
      before: {
        find: [jsonQueryStringify()],
        get: [jsonQueryStringify()],
        create: [jsonQueryStringify()],
        update: [jsonQueryStringify()],
        patch: [jsonQueryStringify()],
        remove: [jsonQueryStringify()]
      }
    });
  });
};
const jsonQueryServer = (app) => {
  app.hooks({ before: { all: [jsonQueryParse()] } });
};

const preventChange = (virtuals, prepFunc = () => {
}) => {
  return skippable("preventChange", async (context) => {
    checkContext(context, "before", ["update", "patch"], "preventChange");
    if (!context.data) {
      return context;
    }
    if (Array.isArray(virtuals)) {
      context.data = Array.isArray(context.data) ? context.data.map((d) => omit(d, virtuals)) : omit(context.data, virtuals);
    } else {
      context.data = await virtualsSerializer(
        filterResolver,
        context.data,
        virtuals,
        context,
        prepFunc
      );
    }
    if (context.method === "update") {
      if (!context.service._patch) {
        throw new errors.GeneralError(
          "Cannot call `preventChange` hook on `update` method if the service does not have a `_patch` method"
        );
      }
      context.result = await context.service._patch(
        context.id,
        context.data,
        context.params
      );
    }
    return context;
  });
};

const defaultOptions = {
  makeKey: (context) => context.path,
  makePoints: (context) => 1
};
const rateLimit = (rateLimiter, _options) => {
  const options = Object.assign({}, defaultOptions, _options);
  return skippable("rateLimit", async (context) => {
    checkContext(context, "before", null, "rateLimit");
    const key = await options.makeKey(context);
    const points = await options.makePoints(context);
    try {
      const rateLimit2 = await rateLimiter.consume(key, points);
      context.params.rateLimit = rateLimit2;
      return context;
    } catch (rateLimit2) {
      context.params.rateLimit = rateLimit2;
      throw new errors.TooManyRequests(rateLimit2);
    }
  });
};

const sanitizeError = (options) => {
  return skippable("sanitizeError", async (context) => {
    const schema = typeof options === "function" ? await options(context) : options;
    context.error = sanitize(context.error, schema);
    return context;
  });
};

const sanitizeResult = (options) => {
  return skippable("sanitizeResult", async (context) => {
    const schema = typeof options === "function" ? await options(context) : options;
    context.result = sanitize(context.result, schema);
    return context;
  });
};

const unique = (arr) => {
  return arr.filter((value, index, self) => self.indexOf(value) === index);
};
const filterColumnQueries = (arrOrObj = []) => {
  const props = Array.isArray(arrOrObj) ? arrOrObj : Object.keys(arrOrObj);
  return props.filter(isColumnQuery).map(getColumnPath);
};
const isColumnQuery = (str) => {
  return str.startsWith("$") && str.includes(".") && str.endsWith("$");
};
const removeColumnSyntax = (str) => {
  return str.substring(1, str.length - 1);
};
const getColumnPath = (str) => {
  const path = removeColumnSyntax(str);
  return path.substring(0, path.lastIndexOf("."));
};
const getColumnProp = (str) => {
  const path = removeColumnSyntax(str);
  return path.substring(path.lastIndexOf(".") + 1);
};
const getColumnPaths = (query) => {
  const queryPaths = filterColumnQueries(query);
  const sortPaths = filterColumnQueries(query.$sort);
  const selectPaths = filterColumnQueries(query.$select);
  const orQueries = (query.$or || []).map(Object.keys).reduce((acc, val) => acc.concat(val), []);
  const orPaths = filterColumnQueries(orQueries);
  return unique([...queryPaths, ...selectPaths, ...sortPaths, ...orPaths]);
};
const getOrder = (key, value) => {
  return [key, parseInt(value, 10) === 1 ? "ASC" : "DESC"];
};
const defaultIncludeOptions = () => {
  return {
    required: true,
    attributes: []
  };
};
const getAssociationOrder = (joinName, associations) => {
  const { paths } = joinName.split(".").reduce(
    (accum, path) => {
      const association = accum.associations[path];
      accum.paths.push(association);
      accum.associations = association.target.associations;
      return accum;
    },
    { paths: [], associations }
  );
  return paths;
};
const getJoinOrder = ($sort, associations) => {
  const order = [];
  Object.keys($sort).forEach((key) => {
    if (isColumnQuery(key)) {
      const columnPath = getColumnPath(key);
      const columnProp = getColumnProp(key);
      const include = [
        ...getAssociationOrder(columnPath, associations),
        ...getOrder(columnProp, $sort[key])
      ];
      order.push(include);
    } else {
      order.push(getOrder(key, $sort[key]));
    }
  });
  return order;
};
const getJoinInclude = (columnPaths, associations, getIncludeOptions, context) => {
  const includes = [];
  const rootPaths = unique(
    columnPaths.map((path) => {
      return path.split(".")[0];
    })
  );
  rootPaths.forEach((rootPath) => {
    if (!associations[rootPath]) {
      throw new errors.BadRequest(`Invalid join query: ${rootPath}`);
    }
    const association = associations[rootPath];
    const includeOptions = getIncludeOptions(association, context);
    const include = Object.assign({ association }, includeOptions);
    const targetPaths = columnPaths.filter((name) => name !== rootPath && name.startsWith(rootPath)).map((name) => name.slice(rootPath.length + 1));
    const targetAssociations = association.target.associations;
    if (targetPaths && targetAssociations) {
      const targetIncludes = getJoinInclude(
        targetPaths,
        targetAssociations,
        getIncludeOptions,
        context
      );
      if (targetIncludes.length) {
        include.include = targetIncludes;
      }
    }
    includes.push(include);
  });
  return includes;
};
const getCleanQuery = (_query) => {
  const query = Object.assign({}, _query);
  if (filterColumnQueries(query.$sort).length) {
    delete query.$sort;
  }
  if (query.$select) {
    query.$select = query.$select.map((string) => {
      return isColumnQuery(string) ? removeColumnSyntax(string) : string;
    });
  }
  return query;
};
const sequelizeJoinQuery = (options = {}) => {
  const makeIncludeOptions = options.makeIncludeOptions || defaultIncludeOptions;
  return skippable("sequelizeJoinQuery", (context) => {
    if (!hasQuery(context)) {
      return context;
    }
    const { query } = context.params;
    const { associations } = context.service.getModel();
    if (!associations || !Object.keys(associations).length) {
      throw new errors.GeneralError(
        "The sequelizeJoinQuery hook cannot be used on a service where the model does not have associations."
      );
    }
    const columnPaths = getColumnPaths(query);
    if (!columnPaths.length) {
      return context;
    }
    const sequelize = {
      include: getJoinInclude(
        columnPaths,
        associations,
        makeIncludeOptions,
        context
      )
    };
    if (filterColumnQueries(query.$sort).length) {
      sequelize.order = getJoinOrder(query.$sort, associations);
    }
    context.params.sequelize = Object.assign(
      {},
      context.params.sequelize,
      sequelize
    );
    context.params.query = getCleanQuery(query);
    return context;
  });
};

const stash = (stashFunc2, context) => {
  let stashed = null;
  return () => {
    if (!stashed) {
      stashed = stashFunc2(context);
    }
    return stashed;
  };
};
const stashFunc = (context) => {
  if (context.id === null) {
    const findParams = Object.assign({}, context.params, { paginate: false });
    return context.service.find(findParams);
  }
  return context.service.get(context.id, context.params);
};
const stashable = (_options) => {
  const options = Object.assign({ propName: "stashed", stashFunc }, _options);
  return skippable("stashable", (context) => {
    checkContext(context, "before", ["update", "patch", "remove"], "stashable");
    context.params[options.propName] = stash(options.stashFunc, context);
    return context;
  });
};

const withData = (virtuals, prepFunc = () => {
}) => {
  return skippable("withData", async (context) => {
    context.data = await virtualsSerializer(
      resolver,
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};

const withQuery = (virtuals, prepFunc = () => {
}) => {
  return skippable("withQuery", async (context) => {
    context.params = context.params || {};
    context.params.query = await virtualsSerializer(
      resolver,
      context.params.query || {},
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};

const withResult = (virtuals, prepFunc = () => {
}) => {
  return skippable("withResult", async (context) => {
    const results = getResults(context);
    const updated = await virtualsSerializer(
      resolver,
      results,
      virtuals,
      context,
      prepFunc
    );
    replaceResults(context, updated);
    return context;
  });
};

const withoutData = (virtuals, prepFunc = () => {
}) => {
  return skippable("withoutData", async (context) => {
    if (!context.data) {
      return context;
    }
    if (Array.isArray(virtuals)) {
      context.data = Array.isArray(context.data) ? context.data.map((d) => omit(d, virtuals)) : omit(context.data, virtuals);
      return context;
    }
    context.data = await virtualsSerializer(
      filterResolver,
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};

const withoutQuery = (virtuals, prepFunc = () => {
}) => {
  return skippable("withoutQuery", async (context) => {
    if (!hasQuery(context)) {
      return context;
    }
    if (Array.isArray(virtuals)) {
      context.params.query = omit(context.params.query, virtuals);
      return context;
    }
    context.params.query = await virtualsSerializer(
      filterResolver,
      context.params.query,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};

const withoutResult = (virtuals, prepFunc = () => {
}) => {
  return skippable("withoutResult", async (context) => {
    const results = getResults(context);
    if (!results) {
      return context;
    }
    if (Array.isArray(virtuals)) {
      const filtered2 = Array.isArray(results) ? results.map((result) => omit(result, virtuals)) : omit(results, virtuals);
      replaceResults(context, filtered2);
      return context;
    }
    const filtered = await virtualsSerializer(
      filterResolver,
      results,
      virtuals,
      context,
      prepFunc
    );
    replaceResults(context, filtered);
    return context;
  });
};

const decoder = (str, decoder2, charset) => {
  const strWithoutPlus = str.replace(/\+/g, " ");
  if (charset === "iso-8859-1") {
    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
  }
  if (/^(\d+|\d*\.\d+)$/.test(str)) {
    return parseFloat(str);
  }
  const keywords = {
    true: true,
    false: false
  };
  if (str in keywords) {
    return keywords[str];
  }
  try {
    return decodeURIComponent(strWithoutPlus);
  } catch (e) {
    return strWithoutPlus;
  }
};
const strictRestQuery = (opts = {}) => (app) => {
  const options = Object.assign(
    {
      arrayLimit: 100,
      depth: 20,
      parameterLimit: 2e3,
      strictNullHandling: true,
      decoder
    },
    opts
  );
  app.set("query parser", (str) => qs__default.parse(str, options));
  return app;
};

exports.ContextCacheMap = ContextCacheMap;
exports.contextCache = contextCache;
exports.joinQuery = joinQuery;
exports.jsonQueryClient = jsonQueryClient;
exports.jsonQueryParse = jsonQueryParse;
exports.jsonQueryServer = jsonQueryServer;
exports.jsonQueryStringify = jsonQueryStringify;
exports.preventChange = preventChange;
exports.rateLimit = rateLimit;
exports.sanitizeError = sanitizeError;
exports.sanitizeResult = sanitizeResult;
exports.sequelizeJoinQuery = sequelizeJoinQuery;
exports.skippable = skippable;
exports.stashable = stashable;
exports.strictRestQuery = strictRestQuery;
exports.withData = withData;
exports.withQuery = withQuery;
exports.withResult = withResult;
exports.withoutData = withoutData;
exports.withoutQuery = withoutQuery;
exports.withoutResult = withoutResult;
