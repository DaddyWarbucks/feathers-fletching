const { skippable } = require('../lib');
const sanitize = require('../lib/sanitize');

module.exports = _schema => {
  return skippable('sanitizeError', async context => {
    const schema =
      typeof _schema === 'function' ? await _schema(context) : _schema;
    context.error = sanitize(context.error, schema);
    return context;
  });
};
