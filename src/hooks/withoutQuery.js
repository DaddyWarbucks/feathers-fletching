const { skippable } = require('../lib');
const { filterSerializer } = require('../lib/filterSerializer');
const { hasQuery, omit } = require('../lib/utils');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutQuery', async context => {
    if (!hasQuery(context)) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      context.params.query = omit(context.params.query, virtuals);
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
