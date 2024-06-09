import { GeneralError, BadRequest } from '@feathersjs/errors';
import type { MaybeArray } from '../utils';
import { isEmpty } from '../utils';
import type { HookContext, Query } from '@feathersjs/feathers';

const unique = (arr: any[]) => {
  return arr.filter((value, index, self) => self.indexOf(value) === index);
};

const filterColumnQueries = (
  arrOrObj: MaybeArray<Record<string, any>> = []
) => {
  const props = Array.isArray(arrOrObj) ? arrOrObj : Object.keys(arrOrObj);
  return props.filter(isColumnQuery).map(getColumnPath);
};

const isColumnQuery = (str: string) => {
  return str.startsWith('$') && str.includes('.') && str.endsWith('$');
};

const removeColumnSyntax = (str: string) => {
  return str.substring(1, str.length - 1);
};

const getColumnPath = (str: string) => {
  const path = removeColumnSyntax(str);
  return path.substring(0, path.lastIndexOf('.'));
};

const getColumnProp = (str: string) => {
  const path = removeColumnSyntax(str);
  return path.substring(path.lastIndexOf('.') + 1);
};

// TODO: This currently only supports the feathers common query
// syntax. But it should probably include things like $and and
// other sequelize specific operators
const getColumnPaths = (query: Query) => {
  const queryPaths = filterColumnQueries(query);
  const sortPaths = filterColumnQueries(query.$sort);
  const selectPaths = filterColumnQueries(query.$select);
  const orQueries = (query.$or || [])
    .map(Object.keys)
    .reduce((acc, val) => acc.concat(val), []);
  const orPaths = filterColumnQueries(orQueries);
  return unique([...queryPaths, ...selectPaths, ...sortPaths, ...orPaths]);
};

const getOrder = (key: string, value: string) => {
  return [key, parseInt(value, 10) === 1 ? 'ASC' : 'DESC'];
};

const defaultIncludeOptions = () => {
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
  Object.keys($sort).forEach((key) => {
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

type GetIncludeOptions = (association: any, context: HookContext) => any;

const getJoinInclude = (
  columnPaths: string[],
  associations,
  getIncludeOptions: GetIncludeOptions,
  context: HookContext
) => {
  const includes = [];
  const rootPaths = unique(
    columnPaths.map((path) => {
      return path.split('.')[0];
    })
  );
  rootPaths.forEach((rootPath) => {
    if (!associations[rootPath]) {
      throw new BadRequest(`Invalid join query: ${rootPath}`);
    }
    const association = associations[rootPath];
    const includeOptions = getIncludeOptions(association, context);
    const include = Object.assign({ association }, includeOptions);
    const targetPaths = columnPaths
      .filter((path) => path !== rootPath && path.split('.')[0] === rootPath)
      .map((path) => path.slice(rootPath.length + 1));
    const targetAssociations = association.target.associations;
    if (targetPaths.length && targetAssociations) {
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

const getCleanQuery = (_query: Query) => {
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
    query.$select = query.$select.map((string) => {
      return isColumnQuery(string) ? removeColumnSyntax(string) : string;
    });
  }
  return query;
};

export type SequelizeJoinQueryOptions = {
  makeIncludeOptions?: (association: any, context: HookContext) => any;
};

export const sequelizeJoinQuery = (options: SequelizeJoinQueryOptions = {}) => {
  const makeIncludeOptions =
    options.makeIncludeOptions || defaultIncludeOptions;

  return (context) => {
    if (isEmpty(context.params.query)) {
      return context;
    }

    const { query } = context.params;
    const { associations } = context.service.getModel();

    if (!associations || !Object.keys(associations).length) {
      throw new GeneralError(
        'The sequelizeJoinQuery hook cannot be used on a service where the model does not have associations.'
      );
    }

    const columnPaths = getColumnPaths(query);

    if (!columnPaths.length) {
      return context;
    }

    const sequelize: Record<string, any> = {
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
