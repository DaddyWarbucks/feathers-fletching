const { skippable } = require('../lib');
const { virtualsSerializer, resolver } = require('../lib/virtualsSerializer');
const { getResults, replaceResults } = require('../lib/utils');

module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withResult', async context => {
    const results = getResults(context);
    const updated = await virtualsSerializer(
      resolver,
      results,
      virtuals,
      context,
      prepFunc
    );
    replaceResults(context, updated);
    return context;
  });
};
