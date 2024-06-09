import type { Application, Params } from '@feathersjs/feathers';

type Callback = (result: any, index: number, total: number) => Promise<void>;

async function handleForEach(params, callback, service, method) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  let pages = 0;
  let current = 0;
  let limit = service.options?.paginate?.max || Number.MAX_SAFE_INTEGER;
  const initialLimit = params.query?.$limit || Number.MAX_SAFE_INTEGER;
  const initialSkip = params.query?.$skip || 0;

  if (initialLimit < limit) {
    limit = initialLimit;
  }

  for (let page = 0; page <= pages; page++) {
    const remaining = initialLimit - current;

    const { total, data } = await service[method]({
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

    for (let index = 0; index < data.length; index++) {
      const result = data[index];
      await callback(result, current, total);
      current++;
    }
  }
}

export const forEachPlugin = () => (app: Application) => {
  app.mixins.push((service: any) => {
    if (service.find) {
      service.forEach = async function forEach(
        params: Params | Callback,
        callback: Callback
      ) {
        await handleForEach(params, callback, service, 'find');
      };
    }

    if (service._find) {
      service._forEach = async function _forEach(
        params: Params,
        callback: Callback
      ) {
        await handleForEach(params, callback, service, '_find');
      };
    }
  });

  return app;
};
