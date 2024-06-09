import type { Application, Params } from '@feathersjs/feathers';

const makeParams = (params: Params) => {
  return {
    ...params,
    paginate: true,
    query: {
      ...params.query,
      $limit: 0
    }
  };
};

export const countPlugin = () => (app: Application) => {
  app.mixins.push((service: any) => {
    if (service.count) {
      return;
    }

    if (service.find) {
      service.count = async function count(params: Params) {
        const result = await service.find(makeParams(params));
        return result.total;
      };
    }

    if (service._find) {
      service._count = async function count(params: Params) {
        const result = await service._find(makeParams(params));
        return result.total;
      };
    }
  });

  return app;
};
