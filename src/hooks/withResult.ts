import { Resolver, getResults, replaceResults } from '../utils';
import type { ResolverFunctions } from '../utils';

export const withResult = (resolvers: ResolverFunctions) => {
  return async (context) => {
    const resolver = new Resolver(resolvers);
    let results = getResults(context);
    if (Array.isArray(results)) {
      results = await Promise.all(
        results.map((result) => resolver.resolve(result, context))
      );
    } else {
      results = await resolver.resolve(results, context);
    }
    replaceResults(context, results);
    return context;
  };
};
