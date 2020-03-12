const { skippable } = require('../lib');
const { filterSerializer } = require('../lib/filterSerializer');
const { hasQuery } = require('../lib/utils');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutQuery', async context => {
    if (!hasQuery(context)) {
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
