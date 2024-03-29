import {
  virtualsSerializer,
  filterResolver,
  getResults,
  replaceResults,
  omit
} from '../utils';
import type { Virtuals, PrepFunction } from '../utils';

export const withoutResult = (
  virtuals: Virtuals,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  prepFunc: PrepFunction = () => {}
) => {
  return async (context) => {
    const results = getResults(context);

    if (!results) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      const filtered = Array.isArray(results)
        ? results.map((result) => omit(result, virtuals))
        : omit(results, virtuals);
      replaceResults(context, filtered);
      return context;
    }

    const filtered = await virtualsSerializer(
      filterResolver,
      results,
      virtuals,
      context,
      prepFunc
    );
    replaceResults(context, filtered);
    return context;
  };
};
