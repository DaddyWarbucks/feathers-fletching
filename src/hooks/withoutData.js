const { skippable } = require('../lib');
const {
  virtualsSerializer,
  filterResolver
} = require('../lib/virtualsSerializer');
const { omit } = require('../lib/utils');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutData', async context => {
    if (!context.data) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      context.data = Array.isArray(context.data)
        ? context.data.map(d => omit(d, virtuals))
        : omit(context.data, virtuals);
      return context;
    }

    context.data = await virtualsSerializer(
      filterResolver,
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
