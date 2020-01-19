// Wrap a hook declaration to make it skippable
module.exports = (hookName, hookFunc) => {
  return context => {
    if (context.params.skipHooks) {
      const { skipHooks } = context.params;
      if (
        skipHooks.includes(hookName) ||
        skipHooks.includes('all') ||
        (skipHooks.includes('before') && context.type === 'before') ||
        (skipHooks.includes('after') && context.type === 'after')
      ) {
        return context;
      } else {
        return hookFunc(context);
      }
    } else {
      return hookFunc(context);
    }
  };
};
