const { BadRequest } = require('@feathersjs/errors');
const { skippable } = require('../lib');
const checkContext = require('../lib/checkContext');
const stashRecord = require('./stashRecord');
const { filterSerializer } = require('../lib/filterSerializer');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('preventChange', async context => {
    checkContext(context, 'before', ['update', 'patch'], 'preventChange');

    context.data = await filterSerializer(
      context.data,
      virtuals,
      context,
      prepFunc
    );

    if (context.method === 'update') {
      const query = (context.params && context.params.query) || {};
      context.result = await context.service._patch(context.id, context.data, {
        query
      });
    }

    return context;
  });
};
