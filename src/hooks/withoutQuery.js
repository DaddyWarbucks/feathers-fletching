const { skippable } = require('../lib');
const { filterSerializer } = require('../lib/filterSerializer');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutQuery', async context => {
    if (
      !context.params ||
      !context.params.query ||
      !Object.keys(context.params.query).length
    ) {
      return context;
    }

    context.params.query = await filterSerializer(
      context.params.query,
      virtuals,
      context,
      prepFunc
    );

    return context;
  });
};
