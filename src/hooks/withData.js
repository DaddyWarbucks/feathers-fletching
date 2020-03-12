const { skippable } = require('../lib');
const { virtualsSerializer } = require('../lib/virtualsSerializer');

// Add data, such as defaults to context.data in a before hook.
// Note `data` could technically be an array of multiple items
// to create/update/patch. Also note that although the keys are
// iterated over syncronously (in order of definition on the virtuals
// object) that if data is an array, all items in the data array
// are run in parrallel.
// The value of each property in the virtuals object can be a function,
// a promise, a function that returns a promise, or a simple value. The
// virtual should return the value to be attached to the key and should
// not mutate context directly.
module.exports = (virtuals, prepFunc = () => {}) => {
  return skippable('withData', async context => {
    context.data = await virtualsSerializer(
      context.data,
      virtuals,
      context,
      prepFunc
    );
    return context;
  });
};
