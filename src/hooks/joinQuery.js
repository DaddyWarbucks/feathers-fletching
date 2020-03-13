const { GeneralError } = require('@feathersjs/errors');
const { skippable } = require('../lib');
const { hasQuery, getResults, replaceResults } = require('../lib/utils');

module.exports = _options => {
  const options = Object.assign({}, _options);

  Object.keys(options).forEach(key => {
    options[key] = Object.assign(
      {
        makeKey: key => key,
        makeParams: (defaultParams, context) => {
          return defaultParams;
        }
      },
      options[key]
    );
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
  const query = Object.assign({}, context.params.query);

  const mergedQuery = mergeOptionDotPaths(query, options);

  const joinKeys = Object.keys(mergedQuery).filter(key => {
    return Object.keys(options).includes(key);
  });

  if (!joinKeys.length) {
    return context;
  }

  const joinQueries = await Promise.all(
    joinKeys
      .map(async key => {
        const option = options[key];
        const optionQuery = mergedQuery[key];

        const defaultParams = {
          paginate: false,
          query: Object.assign({ $select: [option.targetKey] }, optionQuery)
        };

        const makeParams = await option.makeParams(defaultParams, context);

        const result = await context.app
          .service(option.service)
          .find(makeParams);

        // Even though `paginate: false` and matches should be an array,
        // the dev may have used some hook to shape it back to a result obj
        const matches = result.data || result;

        const foreignKeys = makeForeignKeys(matches, option);

        if (foreignKeys.length > 0) {
          context.params.joinQuery = Object.assign(
            {},
            context.params.joinQuery,
            {
              [key]: {
                query: optionQuery,
                foreignKeys
              }
            }
          );
          return {
            [option.foreignKey]: { $in: foreignKeys }
          };
        } else {
          return undefined;
        }
      })
      .filter(joinQuery => {
        return joinQuery !== undefined;
      })
  );

  cleanQuery(query, joinKeys, options);

  mergeQuery(query, joinQueries);

  context.params.query = query;

  return context;
};

const afterHook = (context, options) => {
  const { joinQuery } = context.params;

  if (!joinQuery) {
    return context;
  }

  const results = getResults(context);

  if (Array.isArray(results)) {
    const joinKeys = Object.keys(joinQuery);
    const sorted = [...results];

    joinKeys.forEach(key => {
      const { query, foreignKeys } = joinQuery[key];
      const option = options[key];
      if (query.$sort) {
        sortResults(foreignKeys, sorted, option);
      }
    });

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
  return optionKey && Object.keys(options).includes(optionKey);
};

// Convert queries like {'artist.name': 'JC'} to { artist: { name: 'JC' } }
// Also collect queries from $sort (TODO: and $or)
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

// Remove any invalid queries (aka joinQueries) suchs as
// {'artist.name': 'JC'} or { artist: { name: 'JC' } }
const cleanQuery = (query, joinKeys, options) => {
  joinKeys.forEach(key => {
    delete query[key];
  });

  Object.keys(query).forEach(key => {
    if (isOptionDotPath(key, options)) {
      delete query[key];
    }
  });

  if (query.$sort) {
    const cleanedSort = Object.keys(query.$sort).filter(key => {
      return !isOptionDotPath(key, options);
    });
    if (cleanedSort.length) {
      query.$sort = cleanedSort;
    } else {
      delete query.$sort;
    }
  }
};

// Merge the new joinQueries onto the main query
const mergeQuery = (query, joinQueries) => {
  joinQueries.forEach(joinQuery => {
    Object.assign(query || {}, joinQuery);
  });
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
