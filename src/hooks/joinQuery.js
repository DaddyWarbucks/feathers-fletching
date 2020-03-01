const { skippable } = require('../lib');

const makeIds = (matches, option) => {
  return matches
    .map(match => {
      const id = match[option.targetKey];
      // Convert to strings, convenient for mongo/mongoose ObjectID
      if (id && id.toString) {
        return id.toString();
      } else {
        return id;
      }
    })
    .filter((id, index, self) => {
      // Only return unique ids
      return id && self.indexOf(id) === index;
    });
};

module.exports = options => {
  return skippable('joinQuery', async context => {
    if (
      !context.params ||
      !context.params.query ||
      !Object.keys(context.params.query).length
    ) {
      return context;
    }

    const query = Object.assign({}, context.params.query);

    const queryKeys = Object.keys(query);
    const optionKeys = Object.keys(options);

    const joinKeys = queryKeys.filter(key => optionKeys.includes(key));

    const joinQueries = await Promise.all(
      joinKeys
        .map(async key => {
          const option = options[key];

          const makeParams = option.makeParams
            ? await option.makeParams(query[key], context)
            : {};

          const defaultParams = {
            paginate: false,
            query: Object.assign({ $select: [option.targetKey] }, query[key])
          };

          const params = Object.assign(defaultParams, makeParams);

          const matches = await context.app
            .service(option.service)
            .find(params);

          const idList = option.makeIds
            ? await option.makeIds(matches, query[key], context)
            : makeIds(matches, option);

          if (idList.length > 0) {
            return {
              [option.foreignKey]: { $in: idList }
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
  });
};
