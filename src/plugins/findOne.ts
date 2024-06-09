import type { Application, Params } from '@feathersjs/feathers';

const makeParams = (params: Params) => {
  return {
    ...params,
    paginate: false,
    query: {
      ...params.query,
      $limit: 1
    }
  };
};

export const findOnePlugin = () => (app: Application) => {
  app.mixins.push((service: any) => {
    if (service.findOne) {
      return;
    }

    if (service.find) {
      service.findOne = async function findOne(params: Params) {
        const [result] = await service.find(makeParams(params));
        return result || null;
      };
    }

    if (service._find) {
      service._findOne = async function findOne(params: Params) {
        const [result] = await service._find(makeParams(params));
        return result || null;
      };
    }
  });

  return app;
};
