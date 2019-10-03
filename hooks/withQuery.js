const skippable = require('./skippable');
const virtualsSerializer = require('../lib');

// Force properties onto the query.
// The value of each property in the virtuals object can be a function,
// a promise, a function that returns a promise, or a simple value
module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withQuery', async context => {
    const prepResult = await Promise.resolve(prepFunc(context));
    context.params.query = await virtualsSerializer(
      context.params.query,
      virtuals,
      context,
      prepResult
    );
    return context;
  });
};