import { virtualsSerializer, filterResolver, isEmpty, omit } from '../utils';
import type { Virtuals, PrepFunction } from '../utils';

export const withoutQuery = (
  virtuals: Virtuals,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  prepFunc: PrepFunction = () => { }
) => {
  return async (context) => {
    if (isEmpty(context.params.query)) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      context.params.query = omit(context.params.query, virtuals);
      return context;
    }

    context.params.query = await virtualsSerializer(
      filterResolver,
      context.params.query,
      virtuals,
      context,
      prepFunc
    );

    return context;
  };
};
