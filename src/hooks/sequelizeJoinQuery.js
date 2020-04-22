const { GeneralError, BadRequest } = require('@feathersjs/errors');
const { hasQuery } = require('../lib/utils');

const unique = arr => {
  return arr.filter((value, index, self) => self.indexOf(value) === index);
};

const filterColumnQueries = (arrOrObj = []) => {
  const props = Array.isArray(arrOrObj) ? arrOrObj : Object.keys(arrOrObj);
  return props.filter(isColumnQuery).map(getColumnPath);
};

const isColumnQuery = string => {
  return string.startsWith('$') && string.includes('.') && string.endsWith('$');
};

const removeColumnSyntax = string => {
  return string.substring(1, string.length - 1);
};

const getColumnPath = string => {
  const path = removeColumnSyntax(string);
  return path.substring(0, path.lastIndexOf('.'));
};

const getColumnProp = string => {
  const path = removeColumnSyntax(string);
  return path.substring(path.lastIndexOf('.') + 1);
};

// TODO: This currenlty only supports the feathers common query
// syntax. But it should probably include things like $and and
// other sequelize specific operators
const getColumnPaths = query => {
  const queryPaths = filterColumnQueries(query);
  const sortPaths = filterColumnQueries(query.$sort);
  const orPaths = filterColumnQueries(query.$or);
  const selectPaths = filterColumnQueries(query.$select);
  return unique([...queryPaths, ...selectPaths, ...sortPaths, ...orPaths]);
};

const getOrder = (key, value) => {
  return [key, parseInt(value, 10) === 1 ? 'ASC' : 'DESC'];
};

const defaultIncludeOptions = (association, context) => {
  return {
    required: true,
    attributes: []
  };
};

const getAssociationOrder = (joinName, associations) => {
  const { paths } = joinName.split('.').reduce(
    (accum, path) => {
      const association = accum.associations[path];
      accum.paths.push(association);
      accum.associations = association.target.associations;
      return accum;
    },
    { paths: [], associations }
  );
  return paths;
};

const getJoinOrder = ($sort, associations) => {
  const order = [];
  Object.keys($sort).forEach(key => {
    if (isColumnQuery(key)) {
      const columnPath = getColumnPath(key);
      const columnProp = getColumnProp(key);
      const include = [
        ...getAssociationOrder(columnPath, associations),
        ...getOrder(columnProp, $sort[key])
      ];
      order.push(include);
    } else {
      order.push(getOrder(key, $sort[key]));
    }
  });
  return order;
};

const getJoinInclude = (
  columnPaths,
  associations,
  getIncludeOptions,
  context
) => {
  const includes = [];
  const rootPaths = unique(
    columnPaths.map(path => {
      return path.split('.')[0];
    })
  );
  rootPaths.forEach(rootPath => {
    if (!associations[rootPath]) {
      throw new BadRequest(`Invalid join query: ${rootPath}`);
    }
    const association = associations[rootPath];
    const includeOptions = getIncludeOptions(association, context);
    const include = Object.assign({ association }, includeOptions);
    const targetPaths = columnPaths
      .filter(name => name !== rootPath && name.startsWith(rootPath))
      .map(name => name.slice(rootPath.length + 1));
    const targetAssociations = association.target.associations;
    if (targetPaths && targetAssociations) {
      const targetIncludes = getJoinInclude(
        targetPaths,
        targetAssociations,
        getIncludeOptions,
        context
      );
      if (targetIncludes.length) {
        include.include = targetIncludes;
      }
    }
    includes.push(include);
  });
  return includes;
};

const getCleanQuery = _query => {
  const query = Object.assign({}, _query);

  // If any joined $sorts, the sequelize.order handles it. Remove
  // the query.$sort so the service does not overwrite sequelize.order
  if (filterColumnQueries(query.$sort).length) {
    delete query.$sort;
  }

  // sequelize actually expects non column syntax in the $select.
  // For example, it expects `user.name` instead of `$user.name$`.
  // But this hook expects the $'s for consistency.
  if (query.$select) {
    query.$select = query.$select.map(string => {
      return isColumnQuery(string) ? removeColumnSyntax(string) : string;
    });
  }
  return query;
};

module.exports = (options = {}) => {
  const makeIncludeOptions =
    options.makeIncludeOptions || defaultIncludeOptions;

  return context => {
    if (!hasQuery(context)) {
      return context;
    }

    const { query } = context.params;
    const associations = context.service.getModel().associations;

    if (!associations || !Object.keys(associations).length) {
      throw new GeneralError(
        'The sequelizeJoinQuery hook cannot be used on a service where the model does not have associations.'
      );
    }

    const columnPaths = getColumnPaths(query);

    if (!columnPaths.length) {
      return context;
    }

    const sequelize = {
      include: getJoinInclude(
        columnPaths,
        associations,
        makeIncludeOptions,
        context
      )
    };

    if (filterColumnQueries(query.$sort).length) {
      sequelize.order = getJoinOrder(query.$sort, associations);
    }

    context.params.sequelize = Object.assign(
      {},
      context.params.sequelize,
      sequelize
    );

    context.params.query = getCleanQuery(query);

    return context;
  };
};
