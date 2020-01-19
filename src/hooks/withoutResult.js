const { skippable } = require('../lib');
const filterSerializer = require('../lib/filterSerializer');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutResult', async context => {
    if (context.result.data) {
      context.result.data = await filterSerializer(
        context.result.data,
        virtuals,
        context,
        prepFunc
      );
      return context;
    } else {
      context.result = await filterSerializer(
        context.result,
        virtuals,
        context,
        prepFunc
      );
      return context;
    }
  });
};
