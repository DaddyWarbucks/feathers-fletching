const { skippable } = require('../lib');
const { virtualsSerializer, resolver } = require('../lib/virtualsSerializer');

// Add param, such as defaults to context.param in a before hook.
// Note `param` could technically be an array of multiple items
// to create/update/patch. Also note that although the keys are
// iterated over syncronously (in order of definition on the virtuals
// object) that if param is an array, all items in the param array
// are run in parrallel.
// The value of each property in the virtuals object can be a function,
// a promise, a function that returns a promise, or a simple value. The
// virtual should return the value to be attached to the key and should
// not mutate context directly.
module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withParam', async context => {
    context.params = await virtualsSerializer(
      resolver,
      context.params,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
