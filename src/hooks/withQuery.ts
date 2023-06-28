import { skippable, virtualsSerializer, resolver } from "../utils";

/*
 * Force properties onto the query.
 * The value of each property in the virtuals object can be a function,
 * a promise, a function that returns a promise, or a simple value
 */
export const withQuery = (virtuals, prepFunc = () => {}) => {
  return skippable("withQuery", async (context) => {
    context.params = context.params || {};
    context.params.query = await virtualsSerializer(
      resolver,
      context.params.query || {},
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
