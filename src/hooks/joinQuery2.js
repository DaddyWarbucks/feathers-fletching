const { hasQuery, isObject } = require('../lib/utils');
const { skippable } = require('../lib');
const { clone, traverse, asyncTraverse } = require('../lib/utils');

module.exports = _options => {
  const options = { ..._options };

  Object.keys(options).forEach(key => {
    options[key] = {
      overwrite: false,
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
  const query = clone(context.params.query);
  const normalizedQuery = await normalizeQuery(query, options);
  const transformedQuery = await transformQuery(
    normalizedQuery,
    options,
    context
  );
  context.params.query = transformedQuery;
  return context;
};

const afterHook = (context, options) => { };

const isJoinQuery = (key, options) => {
  const optionKey = key.split('.')[0];
  return !!options[optionKey];
};

const parseJoinQuery = key => {
  const [optionKey, ...rest] = key.split('.');
  const optionQuery = rest.join('.');
  return [optionKey, optionQuery];
};

async function normalizeQuery(query, options) {
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
}

const transformQuery = async (query, options, context) => {
  await asyncTraverse(query, async (parent, [key, value]) => {
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

// Because the matches/foreignKeys arrays are un-paginated and
// potentially very long arrays, try to optimize the functions
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
