const { GeneralError } = require('@feathersjs/errors');
const { skippable } = require('../lib');
const getResults = require('../lib/getResults');
const replaceResults = require('../lib/replaceResults');
const { hasQuery } = require('../lib/utils');

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

  const joinKeys = Object.keys(query).filter(key => {
    return Object.keys(options).includes(key);
  });

  if (!joinKeys.length) {
    return context;
  }

  const joinQueries = await Promise.all(
    joinKeys
      .map(async key => {
        const option = options[key];
        const optionQuery = query[key];

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

  joinKeys.forEach(key => {
    delete query[key];
  });

  joinQueries.forEach(joinQuery => {
    Object.assign(query, joinQuery);
  });

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
