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

            const foreignKeys = matches
              .map(match => {
                return option.parseKey(match[option.targetKey]);
              })
              .filter((id, index, self) => {
                return id && self.indexOf(id) === index;
              });

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
    } else {
      const { joinQuery } = context.params;
      if (!joinQuery) {
        throw new GeneralError(
          'Cannot use `joinQuery` as an after hook if it was not also used on the before hook'
        );
      }

      const results = getResults(context);

      if (Array.isArray(results)) {
        const joinKeys = Object.keys(joinQuery);
        const sorted = [...results];

        joinKeys.forEach(key => {
          const { query, foreignKeys } = joinQuery[key];
          const option = options[key];
          if (query.$sort) {
            const foreignKeyMap = new Map(
              foreignKeys.map((foreignKey, index) => {
                const mapKey = option.parseKey(foreignKey);
                return [mapKey, index];
              })
            );
            sorted.sort((a, b) => {
              const aKey = option.parseKey(a[option.foreignKey]);
              const bKey = option.parseKey(b[option.foreignKey]);
              return foreignKeyMap.get(aKey) - foreignKeyMap.get(bKey);
            });
          }
        });

        replaceResults(context, sorted);
      }

      delete context.params.joinQuery;

      return context;
    }
  });
};
