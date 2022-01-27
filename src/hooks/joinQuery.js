const { hasQuery } = require('../lib/utils');
const { skippable } = require('../lib');
const {
  clone,
  traverse,
  asyncTraverse,
  omit,
  pick,
  isEmpty,
  hasKey
} = require('../lib/utils');

module.exports = _options => {
  const options = { ..._options };

  Object.keys(options).forEach(key => {
    options[key] = {
      overwrite: false,
      makeKey: key => {
        return key.toString ? key.toString() : key;
      },
      makeParams: defaultParams => {
        return defaultParams;
      },
      ...options[key]
    };
  });

  return skippable('joinQuery', async context => {
    if (context.type === 'before') {
      if (!hasJoinQuery(context, options)) {
        return context;
      }

      const [query, joinSort] = cleanJoinQuerySort(
        clone(context.params.query),
        options
      );

      context.joinSort = joinSort;

      if (!isEmpty(joinSort) && context.method === 'find') {
        context.result = await findJoinQuerySort(
          query,
          joinSort,
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

    const joinSort = context.joinSort;
    delete context.joinSort;

    if (context.method === 'find') {
      return context;
    }

    if (
      context.method === 'get' ||
      context.method === 'update' ||
      context.id !== null
    ) {
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

  const joinKeys = Object.keys(query.$sort).filter(key => {
    return isJoinQuery(key, options);
  });

  const joinSort = pick(query.$sort, joinKeys);
  const cleanSort = omit(query.$sort, joinKeys);
  const cleanQuery = omit(query, ['$sort']);

  if (!isEmpty(cleanSort)) {
    cleanQuery.$sort = cleanSort;
  }

  return [cleanQuery, joinSort];
};

const isJoinQuery = (key, options) => {
  const optionKey = key.split('.')[0];
  return !!options[optionKey];
};

const parseJoinQuery = key => {
  const [optionKey, ...rest] = key.split('.');
  const optionQuery = rest.join('.');
  return [optionKey, optionQuery];
};

const normalizeJoinQuery = (query, options) => {
  traverse(query, (parent, [key, value]) => {
    if (!isJoinQuery(key, options)) {
      return;
    }

    const [optionKey, optionQuery] = parseJoinQuery(key);

    if (optionQuery) {
      // Is dot.path query
      delete parent[key];
      parent[optionKey] = {
        ...parent[optionKey],
        [optionQuery]: value
      };
    } else {
      // Is object query
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
    const [optionKey, optionQuery] = parseJoinQuery(key, options);
    const { service, targetKey } = options[optionKey];
    return context.app.service(service).find({
      paginate: false,
      query: { $select: [targetKey], $sort: { [optionQuery]: value } }
    });
  });
};

const sortResults = (joinSort, options, foreignKeyGroups, results) => {
  const sortedResults = [...results];

  foreignKeyGroups.forEach((foreignKeys, index) => {
    const [optionKey] = parseJoinQuery(Object.keys(joinSort)[index], options);
    const { makeKey, foreignKey, targetKey } = options[optionKey];
    const fKeys = foreignKeys.map(item => makeKey(item[targetKey]));
    sortedResults.sort((a, b) => {
      // Sort the results in order of the sorted keys in foreignKeys
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
  const hasLimit = query && hasKey(query, '$limit');
  const limit = query && query.$limit;
  const skip = (query && query.$skip) || 0;
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

// Because the matches/foreignKeys arrays are un-paginated and
// potentially very long arrays, try to optimize the functions
// that map/filter/sort. But, with some basic benchmarking there
// was no difference for array lengths less than 1000, so KISS for now.
const makeForeignKeys = (result, { makeKey, targetKey }) => {
  return result
    .map(result => makeKey(result[targetKey]))
    .filter((key, index, self) => key && self.indexOf(key) === index);

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
