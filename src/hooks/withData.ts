import { Resolver } from '../utils';
import type { ResolverFunctions } from '../utils';

export const withData = (resolvers: ResolverFunctions) => {
  return async (context) => {
    const resolver = new Resolver(resolvers);
    let data = context.data;
    if (Array.isArray(data)) {
      data = await Promise.all(
        data.map((result) => resolver.resolve(result, context))
      );
    } else {
      data = await resolver.resolve(data, context);
    }
    context.data = data;
    return context;
  };
};
