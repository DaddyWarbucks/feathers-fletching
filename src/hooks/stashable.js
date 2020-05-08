const { skippable } = require('../lib');
const checkContext = require('../lib/checkContext');

const stash = (stashFunc, context) => {
  let stashed = null;
  return () => {
    if (!stashed) {
      stashed = stashFunc(context);
    }
    return stashed;
  };
};

const stashFunc = context => {
  if (context.id === null) {
    const findParams = Object.assign({}, context.params, { paginate: false });
    return context.service.find(findParams);
  }

  return context.service.get(context.id, context.params);
};

module.exports = _options => {
  const options = Object.assign({ propName: 'stashed', stashFunc }, _options);

  return skippable('stashable', context => {
    checkContext(context, 'before', ['update', 'patch', 'remove'], 'stashable');
    context.params[options.propName] = stash(options.stashFunc, context);
    return context;
  });
};
