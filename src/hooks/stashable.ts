import type { HookContext } from '@feathersjs/feathers';
import { checkContext } from '../utils';

const stash = (stashFunc, context) => {
  let stashed = null;
  return () => {
    if (!stashed) {
      stashed = stashFunc(context);
    }
    return stashed;
  };
};

const stashFunc = (context: HookContext) => {
  if (context.id === null) {
    const findParams = Object.assign({}, context.params, { paginate: false });
    return context.service.find(findParams);
  }

  return context.service.get(context.id, context.params);
};

export type StashableOptions = {
  propName?: string;
  stashFunc?: (context: HookContext) => Promise<any>;
};

export const stashable = (_options?: StashableOptions) => {
  const options = Object.assign({ propName: 'stashed', stashFunc }, _options);

  (context) => {
    checkContext(context, 'before', ['update', 'patch', 'remove'], 'stashable');
    context.params[options.propName] = stash(options.stashFunc, context);
    return context;
  };
};
