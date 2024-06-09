import type { HookContext } from '@feathersjs/feathers';
import { GeneralError } from '@feathersjs/errors';
import { traverse, isEmpty } from '../utils';

export type MongoJoinQueryOptions = {
  service: string;
  localField: string;
  foreignField: string;
};

type Stage = {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  pipeline?: any[];
};

/* TODO: Remove the joined documents? The user could still query by and return sensitive data. For example, `"user.password": { $ne: null }` would join on the user's password.  */

/* TODO: Add object query syntax. It's likely not used much, but it does affect the query differently than dot.path and should be supported...boo
See: https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
*/

export const mongoJoinQuery = async <H extends HookContext>(context: H) => {
  const { associations } = context.service.getOptions(context.params);

  if (isEmpty(associations)) {
    throw new GeneralError(
      'The mongoJoinQuery hook cannot be used on a service where the service does not have associations.'
    );
  }

  if (!hasLookupQuery(context.params.query, associations)) {
    return context;
  }

  const pipeline = await makePipeline(
    context.app,
    context.params,
    associations
  );

  pipeline.push({ $feathers: {} });

  context.params.pipeline = pipeline;

  return context;
};

const hasLookupQuery = (query: any, associations: any) => {
  if (isEmpty(query) || isEmpty(associations)) {
    return false;
  }

  let has = false;

  traverse(query, (parent, [key]) => {
    if (isLookupQuery(key, associations)) {
      has = true;
    }
  });

  return has;
};

const isLookupQuery = (key: string, associations) => {
  const [lookupKey] = key.split('.');
  return !!associations[lookupKey];
};

const parseLookupQuery = (key: string) => {
  const [lookupKey, ...rest] = key.split('.');
  const queryKey = rest.join('.');
  return [lookupKey, queryKey];
};

const makePipeline = async (app, params, associations) => {
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

  const lookupKeys = Object.keys(lookups);

  for (let index = 0; index < lookupKeys.length; index++) {
    const lookupKey = lookupKeys[index];
    const lookupQuery = lookups[lookupKey];
    const association = associations[lookupKey];

    if (!association) {
      throw new GeneralError(`Invalid join query: ${lookupKey}`);
    }

    const lookupService = app.service(association.service);
    const model = await lookupService.getModel(params);
    const { associations: lookupAssociations } =
      lookupService.getOptions(params);

    const stage: Stage = {
      from: model.collectionName,
      localField: association.localField,
      foreignField: association.foreignField,
      as: lookupKey
    };

    if (hasLookupQuery(lookupQuery, lookupAssociations)) {
      const lookupParams = {
        ...params,
        query: lookupQuery
      };

      const stagePipeline = await makePipeline(
        app,
        lookupParams,
        lookupAssociations
      );

      if (stagePipeline.length) {
        stage.pipeline = stagePipeline;
      }
    }

    pipeline.push({ $lookup: stage });
  }

  return pipeline;
};
