const { GeneralError, NotFound } = require('@feathersjs/errors');
const { skippable } = require('../lib');
const { hasQuery, getResults, replaceResults } = require('../lib/utils');

module.exports = _options => {
  const options = { ..._options };

  Object.keys(options).forEach(key => {
    options[key] = {
      makeKey: key => key,
      makeParams: (defaultParams, context) => {
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
  const { $or: orQuery = [], ...baseQuery } = context.params.query;

  const allQueries = {};

  const [toplevel, ...$or] = await Promise.all(
    [baseQuery, ...orQuery].map(async (query, index) => {
      const merged = mergeOptionDotPaths(query, options);
      const joinKeys = getJoinKeys(merged, options);

      if (!joinKeys.length) {
        return query;
      }

      const { joinQueries, joinParams } = await getJoinQueries(
        joinKeys,
        merged,
        options,
        context
      );

      if (index === 0) {
        allQueries.baseQuery = { ...joinParams };
      } else {
        allQueries.orQuery = [...(allQueries.orQuery || []), joinParams];
      }

      const cleanedQuery = cleanQuery(query, joinKeys, options);
      const mergedQuery = mergeQuery(cleanedQuery, joinQueries);

      return mergedQuery;
    })
  );

  throwIfNotFound(allQueries);

  context.params.joinQuery = allQueries;

  context.params.query = $or.length ? { ...toplevel, $or } : toplevel;

  return context;
};

const afterHook = (context, options) => {
  if (!context.params.joinQuery) {
    return context;
  }

  const { baseQuery, orQuery } = context.params.joinQuery;
  const results = getResults(context);

  if (Array.isArray(results)) {
    const sorted = [...results];

    if (baseQuery) {
      const joinKeys = Object.keys(baseQuery);
      joinKeys.forEach(key => {
        const { query, foreignKeys } = baseQuery[key];
        const option = options[key];
        if (query.$sort) {
          sortResults(foreignKeys, sorted, option);
        }
      });
    }

    if (orQuery) {
      orQuery.forEach(q => {
        const joinKeys = Object.keys(q);
        joinKeys.forEach(key => {
          const { query, foreignKeys } = q[key];
          const option = options[key];
          if (query.$sort) {
            sortResults(foreignKeys, sorted, option);
          }
        });
      });
    }

    replaceResults(context, sorted);
  }

  delete context.params.joinQuery;

  return context;
};

// Determine if a query like `artist.name` is a valid joinQuery
// according to the options. Note some dot paths may be valid
// queries even if not a joinQuery, such as querying mongoose subdocs
const isOptionDotPath = (string, options) => {
  const optionKey = string.split('.').length > 1 && string.split('.')[0];
  return optionKey && !!options[optionKey];
};

// Convert queries like {'artist.name': 'JC'} to { artist: { name: 'JC' } }
// Also collect queries from $sort
const mergeOptionDotPaths = (query, options) => {
  const mergedQuery = {};
  Object.keys(query).forEach(key => {
    if (isOptionDotPath(key, options)) {
      const [optionKey, queryProp] = key.split('.');
      const joinQuery = { [queryProp]: query[key] };
      mergedQuery[optionKey] = Object.assign(
        mergedQuery[optionKey] || {},
        joinQuery
      );
    } else if (options[key]) {
      mergedQuery[key] = Object.assign(mergedQuery[key] || {}, query[key]);
    }
  });

  if (query.$sort) {
    Object.keys(query.$sort).forEach(key => {
      if (isOptionDotPath(key, options)) {
        const [optionKey, queryProp] = key.split('.');
        const joinQuery = { $sort: { [queryProp]: query.$sort[key] } };
        mergedQuery[optionKey] = Object.assign(
          mergedQuery[optionKey] || {},
          joinQuery
        );
      }
    });
  }

  return mergedQuery;
};

const getJoinKeys = (query, options) => {
  return Object.keys(query).filter(key => !!options[key]);
};

const getJoinQueries = async (joinKeys, mergedQuery, options, context) => {
  const joinParams = {};

  const joinQueries = await Promise.all(
    joinKeys.map(async key => {
      const option = options[key];
      const optionQuery = mergedQuery[key];

      const defaultParams = {
        paginate: false,
        query: { $select: [option.targetKey], ...optionQuery }
      };

      const makeParams = await option.makeParams(defaultParams, context);

      const result = await context.app.service(option.service).find(makeParams);

      // Even though `paginate: false` by default and matched should be arr
      // the dev may have used some hook to shape it back to a result obj
      // or may have enabled pagination via makeParams
      const matches = result.data || result;

      const foreignKeys = makeForeignKeys(matches, option);

      Object.assign(joinParams, {
        [key]: {
          query: optionQuery,
          foreignKeys
        }
      });

      return {
        [option.foreignKey]: { $in: foreignKeys }
      };
    })
  );

  return { joinQueries, joinParams };
};

const cleanQuery = (_query, joinKeys, options) => {
  const { ...query } = _query;

  joinKeys.forEach(key => {
    delete query[key];
  });

  Object.keys(query).forEach(key => {
    if (isOptionDotPath(key, options)) {
      delete query[key];
    }
  });

  if (query.$sort) {
    Object.keys(query.$sort).forEach(key => {
      if (isOptionDotPath(key, options)) {
        delete query.$sort[key];
      }
    });
    if (!Object.keys(query.$sort).length) {
      delete query.$sort;
    }
  }

  return query;
};

const mergeQuery = (_query, joinQueries) => {
  const { ...query } = _query;

  joinQueries.forEach(joinQuery => {
    Object.assign(query, joinQuery);
  });

  return query;
};

throwIfNotFound = ({ baseQuery, orQuery }) => {
  // All joinQueries in the baseQuery must have returned results
  if (baseQuery && !joinWasFound(baseQuery)) {
    throw new NotFound();
  }

  // At least one joinQuery in the orQuery has to have returned results
  if (orQuery && !orQuery.find(joinWasFound)) {
    throw new NotFound();
  }
};

const joinWasFound = query => {
  return Object.values(query).every(value => value.foreignKeys.length);
};

// Because the matches/foreignKeys arrays are un-paginated and
// potentially very long arrays, I wanted to optimize the functions
// that map/filter/sort. But, with some basic benchmarking there
// was no difference for array lengths less than 1000, so KISS for now.
const makeForeignKeys = (matches, option) => {
  return matches
    .map(match => {
      return option.makeKey(match[option.targetKey]);
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

const sortResults = (foreignKeys, results, option) => {
  return results.sort((a, b) => {
    // Sort the results in order of the sorted keys in foreignKeys
    const aKey = option.makeKey(a[option.foreignKey]);
    const bKey = option.makeKey(b[option.foreignKey]);
    return foreignKeys.indexOf(aKey) - foreignKeys.indexOf(bKey);
  });

  // When foreignKeys.length > 1000 this is marginally faster from
  // some very, very basic benchmarks. See commented benchmarks below
  // Indexing an object/map should be faster than using indexOf() on a
  // large array. Although there is some time used in creating this
  // map, each subsequent map.get() should be faster than indexOf()
  // const map = new Map(
  //   foreignKeys.map((foreignKey, index) => {
  //     return [foreignKey, index];
  //   })
  // );
  // return results.sort((a, b) => {
  //   // Sort the results in order of the sorted keys in foreignKeys
  //   const aKey = option.parseKey(a[option.foreignKey]);
  //   const bKey = option.parseKey(b[option.foreignKey]);
  //   return map.get(aKey) - map.get(bKey);
  // });
};

// const foreignKeys = [];
// for (i = 0; i < 10000; i++) {
//   foreignKeys.push(Date.now() + Math.random());
// }

// const results = [];
// for (i = 0; i < 10000; i++) {
//   results.push({ id: foreignKeys[i] });
// }

// const opt = {
//   foreignKey: 'id',
//   makeKey: key => key
// };

// console.log('length: ', results.length);

// console.time('sortResults');
// sortResults(foreignKeys, results, opt);
// console.timeEnd('sortResults');

// console.time('makeForeignKeys');
// makeForeignKeys(results, opt);
// console.timeEnd('makeForeignKeys');
