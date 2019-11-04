const { GeneralError } = require('@feathersjs/errors');
const { skippable } = require('../lib');

module.exports = skippable('validateSchema', async context => {
  const schema = context.params && context.params.schema ||
    context.service.options && context.service.options.schema;
  const { data } = context;
  if (!schema) {
    throw new GeneralError(
      `Cannot call hook "validateSchema" on path ${context.path} because it has no schema`
    );
  }
  if (Array.isArray(data)) {
    context.data = await Promise.all(
      data.map(item => {
        return schema.validate(item, { context });
      })
    );
  } else {
    context.data = await schema.validate(data, { context });
  }
  return context;
});
