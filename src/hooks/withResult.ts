import {
  virtualsSerializer,
  resolver,
  getResults,
  replaceResults
} from '../utils';
import type { Virtuals, PrepFunction } from '../utils';

export const withResult = (
  virtuals: Virtuals,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  prepFunc: PrepFunction = () => { }
) => {
  return async (context) => {
    const results = getResults(context);
    const updated = await virtualsSerializer(
      resolver,
      results,
      virtuals,
      context,
      prepFunc
    );
    replaceResults(context, updated);
    return context;
  };
};
