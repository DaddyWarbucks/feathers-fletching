// https://github.com/feathersjs-ecosystem/feathers-hooks-common/blob/master/lib/services/check-context.js
import { GeneralError } from "@feathersjs/errors";
import type { HookContext } from "@feathersjs/feathers";

const stndMethods = ["find", "get", "create", "update", "patch", "remove"];

export const checkContext = (
  context: HookContext,
  type: string | null = null,
  methods: string[] | string = [],
  label = "anonymous"
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
  if (stndMethods.indexOf(context.method) === -1) {
    return;
  }

  const myMethods = Array.isArray(methods) ? methods : [methods]; // safe enough for allowed values

  if (myMethods.length > 0 && myMethods.indexOf(context.method) === -1) {
    const msg = JSON.stringify(myMethods);
    throw new GeneralError(
      `The '${label}' hook can only be used on the '${msg}' service method(s).`
    );
  }
};
