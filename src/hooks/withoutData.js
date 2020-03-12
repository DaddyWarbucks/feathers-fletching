const { skippable } = require('../lib');
const { filterSerializer } = require('../lib/filterSerializer');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutData', async context => {
    context.data = await filterSerializer(
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
