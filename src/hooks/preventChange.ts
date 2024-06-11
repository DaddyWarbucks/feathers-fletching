import { GeneralError } from '@feathersjs/errors';
import { omit, checkContext } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const preventChange = (properties) => {
  return async (context) => {
    checkContext(context, 'before', ['update', 'patch'], 'preventChange');

    if (!context.data) {
      return context;
    }

    context.data = Array.isArray(context.data)
      ? context.data.map((data) => omit(data, ...properties))
      : omit(context.data, ...properties);

    if (context.method === 'update') {
      if (!context.service._patch) {
        throw new GeneralError(
          'Cannot call `preventChange` hook on `update` method if the service does not have a `_patch` method'
        );
      }
      context.result = await context.service._patch(
        context.id,
        context.data,
        context.params
      );
    }

    return context;
  };
};
