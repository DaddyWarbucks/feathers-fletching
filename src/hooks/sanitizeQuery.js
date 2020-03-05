const { skippable } = require('../lib');
const sanitize = require('../lib/sanitize');

module.exports = _schema => {
  return skippable('sanitizeQuery', async context => {
    if (
      !context.params ||
      !context.params.query ||
      !Object.keys(context.params.query).length
    ) {
      return context;
    }
    const schema =
      typeof _schema === 'function' ? await _schema(context) : _schema;
    context.params.query = sanitize(context.params.query, schema);
    return context;
  });
};
