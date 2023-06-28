import {
  skippable,
  virtualsSerializer,
  resolver,
  getResults,
  replaceResults,
} from "../utils";

export const withResult = (virtuals, prepFunc = () => {}) => {
  return skippable("withResult", async (context) => {
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
  });
};
