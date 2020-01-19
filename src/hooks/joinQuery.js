module.exports.joinQuery = options => {
  return async context => {
    if (!context.params.query) {
      return context;
    }

    const query = Object.assign({}, context.params.query);

    const queryKeys = Object.keys(query);
    const optionKeys = Object.keys(options);

    if (!queryKeys.length) {
      return context;
    }

    const joinKeys = queryKeys.filter(value => optionKeys.includes(value));

    const joinQueries = await Promise.all(
      joinKeys.map(async key => {
        const option = options[key];

        const matches = await context.app.service(option.service).find({
          paginate: false,
          query: Object.assign({}, query[key], {
            $select: [option.targetKey]
            // allow this hook to be used clientside, if the dev's server
            // is setup to disablePagination with $limit: -1
            // $limit: -1
          })
        });

        const idList = matches
          .map(match => match[option.targetKey])
          .filter(match => match);

        return {
          [option.foreignKey]: { $in: idList }
        };
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
};
