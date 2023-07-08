import type { ContextCacheMap } from '../utils';
import type { HookContext } from '@feathersjs/feathers';

export const contextCache = <H extends HookContext = HookContext>(
  cacheMap: ContextCacheMap
) => {
  return async (context: H) => {
    if (context.type === 'before') {
      if (context.method === 'get' || context.method === 'find') {
        const value = await cacheMap.get(context);
        if (value) {
          context.result = value;
        }
      }
    } else {
      if (context.method === 'get' || context.method === 'find') {
        await cacheMap.set(context);
      } else {
        await cacheMap.clear(context);
      }
    }
    return context;
  };
}
