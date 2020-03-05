const { skippable } = require('../lib');
const sanitize = require('../lib/sanitize');

module.exports = _schema => {
  return skippable('sanitizeResult', async context => {
    const schema =
      typeof _schema === 'function' ? await _schema(context) : _schema;
    context.result = sanitize(context.result, schema);
    return context;
  });
};
