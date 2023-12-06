import type { HookContext, Query } from '@feathersjs/feathers';
import { GeneralError } from '@feathersjs/errors';
import type { SetPartial } from '../utils';
import {
  hasQuery,
  clone,
  traverse,
  asyncTraverse,
  omit,
  pick,
  isEmpty,
  hasKey
} from '../utils';

export type MongoJoinQueryOptions = {
  service: string;
  localField: string;
  foreignField: string;
};

const query = {
  name: 'Rogue',
  'owner.name': 'DaddyWarbucks'
};

export const mongoJoinQuery = <H extends HookContext>(
  options: MongoJoinQueryOptions
) => {
  const opts = makeOptionsWithDefaults(options);

  return async (context: H) => {
    if (!hasLookupQuery(context, opts)) {
      return context;
    }

    const { associations } = context.service.getOptions
      ? context.service.getOptions(context.params)
      : context.service.options;

    if (!associations || !Object.keys(associations).length) {
      throw new GeneralError(
        'The mongoJoinQuery hook cannot be used on a service where the model does not have associations.'
      );
    }

    const pipeline = makePipeline(context.app, context.params, associations);

    pipeline.push({ $feathers: {} });

    context.params.pipeline = pipeline;

    return context;
  };
};

const makeOptionsWithDefaults = (options: MongoJoinQueryOptions) => {
  return Object.keys(options).reduce((result, key) => {
    const option = options[key];
    result[key] = {
      overwrite: false,
      ...option
    };
    return result;
  }, {} as MongoJoinQueryOptions);
};

const hasLookupQuery = (
  context: HookContext,
  options: MongoJoinQueryOptions
) => {
  if (!hasQuery(context)) {
    return false;
  }

  let has = false;

  traverse(context.params.query, (parent, [key]) => {
    if (isLookupQuery(key, options)) {
      has = true;
    }
  });

  return has;
};

const isLookupQuery = (key: string, lookups: MongoJoinQueryOptions) => {
  const [lookupKey] = key.split('.');
  return !!lookups[lookupKey];
};

const parseLookupQuery = (key: string) => {
  const [lookupKey, ...rest] = key.split('.');
  const queryKey = rest.join('.');
  return [lookupKey, queryKey];
};

const makePipeline = (app, params, associations) => {
  const pipeline = [];
  const lookups = {};

  traverse(params.query, (parent, [key]) => {
    if (!isLookupQuery(key, associations)) {
      return;
    }

    const [lookupKey, queryKey] = parseLookupQuery(key);

    if (lookups[lookupKey]) {
      Object.assign(lookups[lookupKey], { [queryKey]: {} });
    } else {
      lookups[lookupKey] = { [queryKey]: {} };
    }
  });

  Object.keys(lookups).forEach((lookupKey) => {
    const lookupQuery = lookups[lookupKey];
    const association = associations[lookupKey];

    if (!association) {
      throw new GeneralError(`Invalid join query: ${lookupKey}`);
    }

    const lookupService = app.service(association.service);
    const { associations: lookupAssociations, Model } =
      lookupService.getOptions(params);

    const stage = {
      from: Model.collectionName,
      localField: association.localField,
      foreignField: association.foreignField,
      as: lookupKey
    };

    if (lookupAssociations && Object.keys(lookupAssociations).length) {
      const lookupParams = {
        ...params,
        query: lookupQuery
      };

      stage['pipeline'] = makePipeline(app, lookupParams, lookupAssociations);
    }

    pipeline.push({ $lookup: stage });
  });

  return pipeline;
};
