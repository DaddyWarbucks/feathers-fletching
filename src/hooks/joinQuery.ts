import type { HookContext, Query } from '@feathersjs/feathers';
import type { SetPartial } from '../utils';
import {
  clone,
  traverse,
  asyncTraverse,
  omit,
  pick,
  isEmpty,
  hasKey
} from '../utils';

export type JoinQueryEntry = {
  overwrite: boolean;
  makeKey: (key: any) => any;
  makeParams: (
    defaultParams: any,
    context: HookContext,
    option: JoinQueryEntry
  ) => any;
  service: string;
  targetKey: string;
  foreignKey: string;
};

export type JoinQueryOptions = {
  [key: string]: SetPartial<
    JoinQueryEntry,
    'overwrite' | 'makeKey' | 'makeParams'
  >;
};

type JoinQueryOptionsRequired = Record<string, JoinQueryEntry>;

function makeOptionsWithDefaults(options: JoinQueryOptions) {
  return Object.keys(options).reduce((result, key) => {
    const option = options[key];
    result[key] = {
      overwrite: false,
      makeKey: (key) => key,
      makeParams: (defaultParams) => defaultParams,
      ...option
    };
    return result;
  }, {} as JoinQueryOptionsRequired);
}

export const joinQuery = <H extends HookContext>(
  _options: JoinQueryOptions
) => {
  const options = makeOptionsWithDefaults(_options);

  return async (context: H) => {
    if (context.type === 'before') {
      if (!hasJoinQuery(context, options)) {
        return context;
      }

      const [query, joinSort] = cleanJoinQuerySort(
        clone(context.params.query),
        options
      );

      // @ts-expect-error joinSort is not defined on context
      context.joinSort = joinSort;

      if (!isEmpty(joinSort) && context.method === 'find') {
        context.result = await findJoinQuerySort(
          query,
          joinSort,
          context,
          options
        );
        return context;
      }

      context.params.query = await transformJoinQuery(query, context, options);

      return context;
    }

    if (isEmpty(context.joinSort)) {
      return context;
    }

    const { joinSort } = context;
    delete context.joinSort;

    if (context.method === 'find') {
      return context;
    }

    if (
      context.method === 'get' ||
      context.method === 'update' ||
      context.id !== null
    ) {
      return context;
    }

    context.result = await mutateJoinQuerySort(joinSort, context, options);

    return context;
  };
};

const hasJoinQuery = (
  context: HookContext,
  options: JoinQueryOptionsRequired
) => {
  if (isEmpty(context.params.query)) {
    return false;
  }

  let has = false;

  traverse(context.params.query, (parent, [key]) => {
    if (isJoinQuery(key, options)) {
      has = true;
    }
  });

  return has;
};

const cleanJoinQuerySort = (
  query: Query,
  options: JoinQueryOptionsRequired
): [Query, Query] => {
  if (!query.$sort) {
    return [query, {}];
  }

  const joinKeys = Object.keys(query.$sort).filter((key) => {
    return isJoinQuery(key, options);
  });

  const joinSort = pick(query.$sort, ...joinKeys);
  const cleanSort = omit(query.$sort, ...joinKeys);
  const cleanQuery = omit(query, '$sort');

  if (!isEmpty(cleanSort)) {
    cleanQuery.$sort = cleanSort;
  }

  return [cleanQuery, joinSort];
};

const isJoinQuery = (key: string, options: JoinQueryOptionsRequired) => {
  const [optionKey] = key.split('.');
  return !!options[optionKey];
};

const parseJoinQuery = (key: string) => {
  const [optionKey, ...rest] = key.split('.');
  const optionQuery = rest.join('.');
  return [optionKey, optionQuery];
};

const normalizeJoinQuery = (
  query: Query,
  options: JoinQueryOptionsRequired
) => {
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
};

const transformJoinQuery = async (
  query: Query,
  context: HookContext,
  options: JoinQueryOptionsRequired
) => {
  const normalizedQuery = normalizeJoinQuery(query, options);

  await asyncTraverse(normalizedQuery, async (parent, [key, value]) => {
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

const findJoinQuerySort = async (
  query: Query,
  joinSort: Query,
  context: HookContext,
  options: JoinQueryOptionsRequired
) => {
  const transformedJoinQuery = await transformJoinQuery(
    query,
    context,
    options
  );

  const findResults = context.service.find({
    paginate: false,
    query: transformedJoinQuery
  });

  const [allResults, ...foreignKeyGroups] = await Promise.all([
    findResults,
    ...foreignKeyPromises(joinSort, context, options)
  ]);

  const sortedResults = sortResults(
    joinSort,
    options,
    foreignKeyGroups,
    allResults
  );

  const paginatedResults = paginateResults(context, sortedResults);

  return paginatedResults;
};

const mutateJoinQuerySort = async (
  joinSort: Query,
  context: HookContext,
  options: JoinQueryOptionsRequired
) => {
  const foreignKeyGroups = await Promise.all(
    foreignKeyPromises(joinSort, context, options)
  );

  const sortedResults = sortResults(
    joinSort,
    options,
    foreignKeyGroups,
    context.result
  );

  return sortedResults;
};

const foreignKeyPromises = (
  joinSort: Query,
  context: HookContext,
  options: JoinQueryOptionsRequired
) => {
  return Object.entries(joinSort).map(async ([key, value]) => {
    const [optionKey, optionQuery] = parseJoinQuery(key);
    const { service, targetKey } = options[optionKey];
    return await context.app.service(service).find({
      paginate: false,
      query: { $select: [targetKey], $sort: { [optionQuery]: value } }
    });
  });
};

const sortResults = (
  joinSort: Query,
  options: JoinQueryOptionsRequired,
  foreignKeyGroups,
  results
) => {
  const sortedResults = [...results];

  foreignKeyGroups.forEach((foreignKeys, index) => {
    const [optionKey] = parseJoinQuery(Object.keys(joinSort)[index]);
    const { makeKey, foreignKey, targetKey } = options[optionKey];
    const fKeys = foreignKeys.map((item) => makeKey(item[targetKey]));
    sortedResults.sort((a, b) => {
      // Sort the results in order of the sorted keys in foreignKeys
      const aKey = makeKey(a[foreignKey]);
      const bKey = makeKey(b[foreignKey]);
      return fKeys.indexOf(aKey) - fKeys.indexOf(bKey);
    });
  });

  return sortedResults;
};

const paginateResults = (context: HookContext, results: any[]) => {
  const pagination =
    context.service &&
    context.service.options &&
    context.service.options.paginate;
  const paginate = context.params && context.params.paginate;
  const query = context.params && context.params.query;
  const hasLimit = query && hasKey(query, '$limit');
  const limit = query && query.$limit;
  const skip = (query && query.$skip) || 0;
  const total = results.length;
  const result = {
    skip,
    limit,
    total
  };

  if (!pagination || paginate === false) {
    if (!hasLimit) {
      return results;
    }

    if (limit === -1) {
      return [];
    }

    return results.slice(skip);
  }

  if (!hasLimit) {
    return {
      ...result,
      data: results.slice(skip, pagination.default + 1)
    };
  }

  if (limit === -1) {
    return {
      ...result,
      data: []
    };
  }

  if (query.$limit > pagination.max) {
    return {
      ...result,
      data: results.slice(skip, pagination.max + 1)
    };
  }

  return {
    ...result,
    data: results.slice(skip, limit + 1)
  };
};

// Because the matches/foreignKeys arrays are un-paginated and
// potentially very long arrays, try to optimize the functions
// that map/filter/sort. But, with some basic benchmarking there
// was no difference for array lengths less than 1000, so KISS for now.
const makeForeignKeys = (result, { makeKey, targetKey }) => {
  return result
    .map((result) => makeKey(result[targetKey]))
    .filter((key, index, self) => key && self.indexOf(key) === index);

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
