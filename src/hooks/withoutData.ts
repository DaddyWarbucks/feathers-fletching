import { virtualsSerializer, filterResolver, omit } from '../utils';
import type { Virtuals, PrepFunction } from '../utils';

export const withoutData = (
  virtuals: Virtuals,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  prepFunc: PrepFunction = () => {}
) => {
  return async (context) => {
    if (!context.data) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      context.data = Array.isArray(context.data)
        ? context.data.map((d) => omit(d, virtuals))
        : omit(context.data, virtuals);
      return context;
    }

    context.data = await virtualsSerializer(
      filterResolver,
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  };
};
