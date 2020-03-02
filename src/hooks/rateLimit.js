const { TooManyRequests } = require('@feathersjs/errors');
const { skippable } = require('../lib');
const checkContext = require('../lib/checkContext');

const defaultOptions = {
  makeKey: context => context.path,
  makePoints: context => 1
};

module.exports = (rateLimiter, _options) => {
  const options = Object.assign({}, defaultOptions, _options);
  return skippable('rateLimit', async context => {
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
