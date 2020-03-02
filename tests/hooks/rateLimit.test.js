const { RateLimiterMemory } = require('rate-limiter-flexible');
const assert = require('assert');
const rateLimit = require('../../src/hooks/rateLimit');

describe('rateLimit', () => {
  it('Rate limits', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: {}
    };

    const rateLimiter = new RateLimiterMemory({
      points: 1,
      duration: 1
    });

    const context1 = await rateLimit(rateLimiter)(context);
    const shouldReject = rateLimit(rateLimiter)(context);

    await assert.rejects(shouldReject, { name: 'TooManyRequests' });
  });

  it('Can use custom makeKey option', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: {}
    };

    const rateLimiter = new RateLimiterMemory({
      points: 1,
      duration: 1
    });

    // By using a random key, the rate limiter should not limit
    // these two requests proving makeKey worked
    const makeKey = context => Math.random();

    const context1 = await rateLimit(rateLimiter, { makeKey })(context);
    const shouldNotReject = rateLimit(rateLimiter, { makeKey })(context);

    await assert.doesNotReject(shouldNotReject);
  });

  it('Can use custom makePoints option', async () => {
    const context = {
      type: 'before',
      method: 'find',
      params: {}
    };

    const rateLimiter = new RateLimiterMemory({
      points: 1,
      duration: 1
    });

    // By consuming more points than allowed the first request
    // should throw, proving makePoints worked
    const makePoints = context => 2;

    const shouldReject = rateLimit(rateLimiter, { makePoints })(context);

    await assert.rejects(shouldReject, { name: 'TooManyRequests' });
  });
});
