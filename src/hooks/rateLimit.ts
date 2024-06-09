import { TooManyRequests } from '@feathersjs/errors';
import { checkContext } from '../utils';
import type { RateLimiterMemory } from 'rate-limiter-flexible';
import type { HookContext } from '@feathersjs/feathers';

const defaultOptions = {
  makeKey: (context) => context.path,
  makePoints: () => 1
} satisfies RateLimitOptions;

export type RateLimitOptions = {
  makeKey?: (context: HookContext) => string;
  makePoints?: (context: HookContext) => number;
};

export const rateLimit = (
  rateLimiter: RateLimiterMemory,
  options?: RateLimitOptions
) => {
  options = { ...defaultOptions, ...options };
  return async (context) => {
    checkContext(context, 'before', null, 'rateLimit');
    const key = await options.makeKey(context);
    const points = await options.makePoints(context);
    try {
      const rateLimit = await rateLimiter.consume(key, points);
      context.params.rateLimit = rateLimit;
      return context;
    } catch (rateLimit) {
      // node-rate-limiter-flexible returns the `RateLimiterRes` on err too
      context.params.rateLimit = rateLimit;
      throw new TooManyRequests(rateLimit);
    }
  };
};
