const { hasQuery, isObject } = require('../lib/utils');
const { skippable } = require('../lib');

module.exports = _options => {
  const options = { ..._options };

  Object.keys(options).forEach(key => {
    options[key] = {
      overwrite: true,
      makeKey: key => key,
      makeParams: (defaultParams, context, option) => {
        return defaultParams;
      },
      ...options[key]
    };
  });

  return skippable('joinQuery', async context => {
    if (!hasQuery(context)) {
      return context;
    }

    if (context.type === 'before') {
      return beforeHook(context, options);
    } else {
      return afterHook(context, options);
    }
  });
};

const beforeHook = async (context, options) => {
  const { query } = context.params;
  const normalizedQuery = await normalizeQuery(query, options);
  const cleanedQuery = await cleanQuery(normalizedQuery, options, context);
  context.params.query = cleanedQuery;
  return context;
};

const afterHook = (context, options) => { };

const isJoinQuery = (key, options) => {
  const [optionKey] = parseJoinQuery(key);
  return !!options[optionKey];
};

const parseJoinQuery = key => {
  const [optionKey, ...rest] = key.split('.');
  const optionQuery = rest.join('.');
  return [optionKey, optionQuery];
};

const traverse = async (obj, callback) => {
  await Promise.all(
    Object.entries(obj).map(async ([rootKey, rootVal]) => {
      if (Array.isArray(rootVal)) {
        await Promise.all(
          rootVal.map(childVal => traverse(childVal, callback))
        );
      }
      if (isObject(rootVal)) {
        await traverse(rootVal, callback);
      }
      return callback(obj, [rootKey, rootVal]);
    })
  );

  return obj;
};

async function normalizeQuery(query, options) {
  const normalizedQuery = await traverse(
    query,
    async (parent, [key, value]) => {
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
    }
  );

  Object.entries(normalizedQuery).forEach(([rootKey, rootVal]) => {
    if (!isJoinQuery(rootKey, options)) {
      return;
    }

    const option = options[rootKey];
    if (option.overwrite === true) {
      return;
    }

    delete normalizedQuery[rootKey];
    normalizedQuery.$and = normalizedQuery.$and || [];
    normalizedQuery.$and.push({ [rootKey]: rootVal });
  });

  return normalizedQuery;
}

const cleanQuery = async (query, options, context) => {
  return traverse(query, async (parent, [key, value]) => {
    if (!isJoinQuery(key, options)) {
      return;
    }

    delete parent[key];

    const option = options[key];

    const defaultParams = makeDefaultParams(query, value, context, option);

    const params = await option.makeParams(defaultParams, context, option);

    const result = await context.app.service(option.service).find(params);

    parent[option.foreignKey] = {
      $in: makeForeignKeys(result.data || result, option)
    };

    // return parent;

    // parent[foreignKey] = await
  });
};

// Because the matches/foreignKeys arrays are un-paginated and
// potentially very long arrays, I wanted to optimize the functions
// that map/filter/sort. But, with some basic benchmarking there
// was no difference for array lengths less than 1000, so KISS for now.
const makeForeignKeys = (result, { makeKey, targetKey }) => {
  return result
    .map(match => {
      return makeKey(match[targetKey]);
    })
    .filter((key, index, self) => {
      // Filter by keys that exist and are unique
      return key && self.indexOf(key) === index;
    });

  // const map = new Map();
  // const foreignKeys = [];
  // matches.forEach(match => {
  //   const key = option.makeKey(match[option.targetKey]);
  //   // Filter by keys that exist and are unique
  //   if (key && !map.get(key)) {
  //     map.set(key, true);
  //     foreignKeys.push(key);
  //   }
  // });
  // return foreignKeys;
};

const makeDefaultParams = (query, joinQuery, context, option) => {
  const joinService = context.app.service(option.service);
  const service = context.service;
  const servicePaginate = service.options && service.options.paginate;
  const joinPaginate = joinService.options && joinService.options.paginate;

  const defaultQuery = { $select: [option.targetKey], ...joinQuery };

  const defaultParams = {
    paginate: false,
    query: defaultQuery
  };

  if (context.params.paginate === false || !servicePaginate || query.$skip) {
    return defaultParams;
  }

  const hasLimit = Object.prototype.hasOwnProperty.call(query, '$limit');

  if (!joinPaginate) {
    if (hasLimit) {
      if (query.$limit === 0) {
        return defaultParams;
      }
      return {
        query: {
          ...defaultQuery,
          $limit: query.$limit
        }
      };
    }

    return {
      query: {
        ...defaultQuery,
        $limit: servicePaginate.default
      }
    };
  }

  if (hasLimit) {
    if (query.$limit === 0) {
      return defaultParams;
    }
    return query.$limit <= joinPaginate.max
      ? {
        query: {
          ...defaultQuery,
          $limit: query.$limit
        }
      }
      : defaultParams;
  }

  if (servicePaginate.default <= joinPaginate.default) {
    return {
      query: {
        ...defaultQuery,
        $limit: servicePaginate.default
      }
    };
  }

  if (
    servicePaginate.default > joinPaginate.default &&
    servicePaginate.default <= joinPaginate.max
  ) {
    return {
      query: {
        ...defaultQuery,
        $limit: servicePaginate.default
      }
    };
  }

  return defaultParams;
};
