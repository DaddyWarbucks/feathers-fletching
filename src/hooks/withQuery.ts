import { Resolver, isEmpty } from '../utils';
import type { ResolverFunctions } from '../utils';

export const withQuery = (resolvers: ResolverFunctions) => {
  return async (context) => {
    if (isEmpty(context.params.query)) {
      return context;
    }
    const resolver = new Resolver(resolvers);
    context.params.query = await resolver.resolve(
      context.params.query,
      context
    );
    return context;
  };
};
