const unset = require('unset-value');

const { skippable } = require('../lib');
const {
  virtualsSerializer,
  filterResolver
} = require('../lib/virtualsSerializer');
const { omit } = require('../lib/utils');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withoutParam', async context => {
    if (!context.params) {
      context.params = {};
    }

    if (Array.isArray(virtuals)) {
      Array.isArray(context.data)
        ? context.data.forEach(d => unset(context.params, virtuals))
        : unset(context.params, virtuals);
      return context;
    }

    context.params = await virtualsSerializer(
      filterResolver,
      context.params,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
