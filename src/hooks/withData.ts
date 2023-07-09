import type { Virtuals, PrepFunction } from '../utils';
import { virtualsSerializer, resolver } from '../utils';

/**
 * Add data, such as defaults to context.data in a before hook.
 *
 * Note `data` could technically be an array of multiple items
 * to create/update/patch. Also note that although the keys are
 * iterated over syncronously (in order of definition on the virtuals
 * object) that if data is an array, all items in the data array
 * are run in parallel.
 *
 * The value of each property in the virtuals object can be a function,
 * a promise, a function that returns a promise, or a simple value. The
 * virtual should return the value to be attached to the key and should
 * not mutate context directly.
 */

export const withData = (
  virtuals: Virtuals,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  prepFunc: PrepFunction = () => {}
) => {
  return async (context) => {
    context.data = await virtualsSerializer(
      resolver,
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  };
};
