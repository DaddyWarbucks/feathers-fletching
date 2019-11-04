const { skippable, virtualsSerializer } = require('../lib');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withResult', async context => {
    const prepResult = await Promise.resolve(prepFunc(context));
    if (context.result.data) {
      // This is the result of a `find` with pagination
      context.result.data = await Promise.all(
        context.result.data.map(item =>
          virtualsSerializer(item, virtuals, context, prepResult)
        )
      );
      return context;
    } else if (Array.isArray(context.result)) {
      // This is the result of a find w/o pagination or the result of
      // a multi create/update/patch
      context.result = await Promise.all(
        context.result.map(item =>
          virtualsSerializer(item, virtuals, context, prepResult)
        )
      );
      return context;
    } else {
      // Single result from create/update/patch
      context.result = await virtualsSerializer(
        context.result,
        virtuals,
        context,
        prepResult
      );
    }
  });
};