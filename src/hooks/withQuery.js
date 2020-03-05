const { skippable } = require('../lib');
const virtualsSerializer = require('../lib/virtualsSerializer');

// Force properties onto the query.
// The value of each property in the virtuals object can be a function,
// a promise, a function that returns a promise, or a simple value
module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withQuery', async context => {
    context.params = context.params || {};
    context.params.query = await virtualsSerializer(
      context.params.query || {},
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
