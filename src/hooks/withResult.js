const { skippable } = require('../lib');
const { virtualsSerializer } = require('../lib/virtualsSerializer');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withResult', async context => {
    if (context.result.data) {
      context.result.data = await virtualsSerializer(
        context.result.data,
        virtuals,
        context,
        prepFunc
      );
      return context;
    } else {
      context.result = await virtualsSerializer(
        context.result,
        virtuals,
        context,
        prepFunc
      );
      return context;
    }
  });
};
