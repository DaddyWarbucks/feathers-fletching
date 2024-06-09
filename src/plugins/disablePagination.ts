import type { Application, Params } from '@feathersjs/feathers';

interface PaginationParams extends Params {
  paginate?: boolean;
}

async function handleSyncFind(params, service, method) {
  if (params.paginate !== false) {
    return method(params);
  }

  let pages = 0;
  let limit = service.options?.paginate?.max || Number.MAX_SAFE_INTEGER;
  const initialLimit = params.query?.$limit || Number.MAX_SAFE_INTEGER;
  const initialSkip = params.query?.$skip || 0;
  const result = [];

  if (initialLimit < limit) {
    limit = initialLimit;
  }

  for (let page = 0; page <= pages; page++) {
    const remaining = initialLimit - result.length;

    const { total, data } = await method({
      ...params,
      paginate: true,
      query: {
        ...params.query,
        $limit: remaining < limit ? remaining : limit,
        $skip: limit * page + initialSkip
      }
    });

    if (page === 0) {
      limit = data.length;
      pages = Math.ceil(total - data.length / limit);
    }

    result.push(...data);
  }

  return result;
}

async function handleAsyncFind(params, service, method) {
  if (params.paginate !== false) {
    return method(params);
  }

  let pages = 0;
  let limit = service.options?.paginate?.max || Number.MAX_SAFE_INTEGER;
  const initialLimit = params.query?.$limit || Number.MAX_SAFE_INTEGER;
  const initialSkip = params.query?.$skip || 0;
  const result = [];

  if (initialLimit < limit) {
    limit = initialLimit;
  }

  const { total, data } = await method({
    ...params,
    paginate: true,
    query: {
      ...params.query,
      $limit: limit,
      $skip: initialSkip
    }
  });

  result.push(...data);

  limit = data.length;
  pages = Math.ceil(total - data.length / limit);

  const promises = [];

  for (let page = 1; page <= pages; page++) {
    const remaining = initialLimit - result.length;

    const promise = method({
      ...params,
      paginate: true,
      query: {
        ...params.query,
        $limit: remaining < limit ? remaining : limit,
        $skip: limit * page + initialSkip
      }
    });

    promises.push(promise);
  }

  const pageResults = await Promise.all(promises);
  pageResults.forEach(({ data }) => result.push(...data));

  return result;
}

export const disabledPaginationPlugin = ({ mode }) => {
  return (app: Application) => {
    app.mixins.push((service: any) => {
      if (service.find) {
        const method = service.find.bind(service);
        service.find = async function find(params: PaginationParams) {
          return mode === 'async'
            ? handleAsyncFind(params, service, method)
            : handleSyncFind(params, service, method);
        };
      }

      if (service._find) {
        const method = service._find.bind(service);
        service._find = async function _find(params: PaginationParams) {
          return mode === 'async'
            ? handleAsyncFind(params, service, method)
            : handleSyncFind(params, service, method);
        };
      }
    });

    return app;
  };
};
