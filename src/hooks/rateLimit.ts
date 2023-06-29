import { TooManyRequests } from '@feathersjs/errors';
import { skippable, checkContext } from '../utils';
import type { RateLimiterMemory } from 'rate-limiter-flexible';

const defaultOptions = {
  makeKey: (context) => context.path,
  makePoints: (context) => 1
} satisfies RateLimitOptions;

export type RateLimitOptions = {
  makeKey?: (context) => string;
  makePoints?: (context) => number;
};

export const rateLimit = (
  rateLimiter: RateLimiterMemory,
  _options?: RateLimitOptions
) => {
  const options = Object.assign({}, defaultOptions, _options);
  return skippable('rateLimit', async (context) => {
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
  });
};
