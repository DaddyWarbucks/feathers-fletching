const { BadRequest } = require('@feathersjs/errors');
const { skippable, checkContext } = require('../lib');
const stashRecord = require('./stashRecord');

// TODO: preventChange should handle an array at context.data

module.exports = function preventChange(_props, _options) {
  return skippable('preventChange', async context => {
    checkContext(context, 'before', ['update', 'patch'], 'preventChange');
    const props = Array.isArray(_props) ? _props : [_props];
    const options = {
      // Default to false because this works for .update as well.
      // Otherwise it would throw an error when the client sends
      // the whole payload for an update, which feels weird.
      throwError: false,
      stashProp: 'stashed',
      getParamsFunc: () => {},
      ..._options
    };
    const { throwError, stashProp, getParamsFunc } = options;
    if (throwError) {
      const errors = props.filter(
        prop => typeof context.data[prop] !== 'undefined'
      );
      if (errors.length) {
        throw new BadRequest(`Cannot change properties ${props}.`);
      }
    }
    if (context.method === 'patch') {
      props.forEach(prop => {
        delete context.data[prop];
        return context;
      });
    } else {
      if (!context.params[stashProp]) {
        context = await stashRecord(stashProp, getParamsFunc)(context);
      }
      props.forEach(prop => {
        context.data[prop] = context.params[stashProp][prop];
      });
      return context;
    }
  });
};
