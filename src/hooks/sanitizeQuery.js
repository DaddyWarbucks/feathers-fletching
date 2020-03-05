const { skippable } = require('../lib');
const sanitize = require('../lib/sanitize');

module.exports = _schema => {
  return skippable('sanitizeData', async context => {
    const schema =
      typeof _schema === 'function' ? await _schema(context) : _schema;
    context.data = sanitize(context.data, schema);
    return context;
  });
};
