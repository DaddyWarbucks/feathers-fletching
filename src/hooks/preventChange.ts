import { GeneralError } from '@feathersjs/errors';
import {
  omit,
  checkContext,
  virtualsSerializer,
  filterResolver
} from '../utils';

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const preventChange = (virtuals, prepFunc = () => { }) => {
  return async (context) => {
    checkContext(context, 'before', ['update', 'patch'], 'preventChange');

    if (!context.data) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      context.data = Array.isArray(context.data)
        ? context.data.map((d) => omit(d, virtuals))
        : omit(context.data, virtuals);
    } else {
      context.data = await virtualsSerializer(
        filterResolver,
        context.data,
        virtuals,
        context,
        prepFunc
      );
    }

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
  );
};
