// https://github.com/feathersjs-ecosystem/feathers-hooks-common/blob/master/lib/services/check-context.ts
import { GeneralError } from '@feathersjs/errors';
import type { HookContext } from '@feathersjs/feathers';

const standardMethods = ['find', 'get', 'create', 'update', 'patch', 'remove'];

export const checkContext = (
  context: HookContext,
  type: string | null = null,
  methods: string[] | string = [],
  label = 'anonymous'
) => {
  if (type && context.type !== type) {
    throw new GeneralError(
      `The '${label}' hook can only be used as a '${type}' hook.`
    );
  }

  if (!methods) {
    return;
  }

  // allow custom methods
  if (standardMethods.indexOf(context.method) === -1) {
    return;
  }

  methods = Array.isArray(methods) ? methods : [methods];

  if (methods.length > 0 && methods.indexOf(context.method) === -1) {
    const msg = JSON.stringify(methods);
    throw new GeneralError(
      `The '${label}' hook can only be used on the '${msg}' service method(s).`
    );
  }
};
