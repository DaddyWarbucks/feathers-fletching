const { GeneralError } = require('@feathersjs/errors');
const { skippable } = require('../lib');
const getResults = require('../lib/getResults');
const replaceResults = require('../lib/replaceResults');

module.exports = opts => {
  const options = Object.assign({}, opts);

  Object.keys(options).forEach(key => {
    options[key] = Object.assign(
      {
        parseKey: key => key,
        makeParams: () => {
          return {};
        }
      },
      options[key]
    );
  });

  return skippable('joinQuery', async context => {
    if (
      !context.params ||
      !context.params.query ||
      !Object.keys(context.params.query).length
    ) {
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

  const queryKeys = Object.keys(query);
  const optionKeys = Object.keys(options);

  const joinKeys = queryKeys.filter(key => optionKeys.includes(key));

  const joinQueries = await Promise.all(
    joinKeys
      .map(async key => {
        const option = options[key];

        const makeParams = await option.makeParams(query[key], context);

        const defaultParams = {
          paginate: false,
          query: Object.assign({ $select: [option.targetKey] }, query[key])
        };

        const matches = await context.app
          .service(option.service)
          .find(Object.assign(defaultParams, makeParams));

        const foreignKeys = makeForeignKeys(matches, option);

        if (foreignKeys.length > 0) {
          context.params.joinQuery = Object.assign(
            {},
            context.params.joinQuery,
            {
              [key]: {
                query: query[key],
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

  optionKeys.forEach(key => {
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
// that map/filter/sort using foreignKeys.indexOf(). But, with some
// basic benchmarking there was no difference for array lengths
// less than 1000, so KISS for now.
const makeForeignKeys = (matches, option) => {
  return matches
    .map(match => {
      return option.parseKey(match[option.targetKey]);
    })
    .filter((key, index, self) => {
      // Filter by keys that exist and are unique
      return key && self.indexOf(key) === index;
    });

  // const map = new Map();
  // const foreignKeys = [];
  // matches.forEach(match => {
  //   const key = option.parseKey(match[option.targetKey]);
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
    const aKey = option.parseKey(a[option.foreignKey]);
    const bKey = option.parseKey(b[option.foreignKey]);
    return foreignKeys.indexOf(aKey) - foreignKeys.indexOf(bKey);
  });

  // When foreignKeys.length > 1000 this is

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
//   parseKey: key => key
// };

// console.log('length: ', results.length);

// console.time('sortResults');
// sortResults(foreignKeys, results, opt);
// console.timeEnd('sortResults');

// console.time('makeForeignKeys');
// makeForeignKeys(results, opt);
// console.timeEnd('makeForeignKeys');
