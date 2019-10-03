const { checkContext } = require('feathers-hooks-common');
const { skippable } = require('../lib');

module.exports = (
  prop = 'stashed',
  getParamsFunc = () => {}
) => {
  return skippable('stashRecord', async context => {
    checkContext(
      context,
      'before',
      ['update', 'patch', 'remove'],
      'stashRecord'
    );
    // Allow the caller to create the params for the underlying .get()
    // call. We cannot just pass context.params because those were
    // intended for the parent call and will lead to unexpected results
    // when trying to call this next .get(). For example, although it is
    // techinically an internall call, it would still pass provider. If you
    // want to do that, pass a new function as the second argument that
    // just returns params: context => context.params
    const params = await getParamsFunc(context);
    const stashed = await context.service.get(context.id, params);
    context.params[prop] = Object.freeze(stashed);
    return context;
  });
};
