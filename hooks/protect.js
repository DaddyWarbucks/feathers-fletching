// Copied from https://github.com/feathersjs/feathers/blob/master/packages/authentication-local/src/hooks/protect.ts
// It was a basic conversion back to JS from TS
// Now protects on internal and external calls and also allows
// the skipHooks to pass ['protect.password'] to only skip
// protecting certain field

const omit = require('lodash.omit');
const { skippable } = require('../lib');

module.exports = (...fields) => {
  return skippable('protect', context => {
    // The hook caller did not pass skipHooks: ['protect'] which
    // would have skipped this whole call, but they may have passed
    // somehting like skipHooks: ['protect.password'] signaling
    // that we should skip protecting just that field
    const { skipHooks = [] } = context.params;
    const protectedFields = fields.filter(
      field => !skipHooks.includes(`protect.${field}`)
    );
    const { result } = context;
    if (!result) {
      return context;
    }
    const protect = current => {
      const data =
        typeof current.toJSON === 'function' ? current.toJSON() : current;
      return omit(data, protectedFields);
    };

    if (Array.isArray(result)) {
      context.result = result.map(protect);
    } else if (result.data && context.method === 'find') {
      context.result = Object.assign({}, result, {
        data: result.data.map(protect)
      });
    } else {
      context.result = protect(result);
    }

    return context;
  });
};
