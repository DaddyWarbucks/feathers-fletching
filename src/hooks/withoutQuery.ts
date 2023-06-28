import {
  skippable,
  virtualsSerializer,
  filterResolver,
  hasQuery,
  omit,
} from "../utils";

export const withoutQuery = (virtuals, prepFunc = () => {}) => {
  return skippable("withoutQuery", async (context) => {
    if (!hasQuery(context)) {
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
  });
};
