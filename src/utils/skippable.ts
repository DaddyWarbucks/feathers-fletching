import { GeneralError } from "@feathersjs/errors";
import type { HookContext } from "@feathersjs/feathers";
import type { Promisable } from "./utils";

// Wrap a hook declaration to make it skippable
export const skippable = (
  hookName: string,
  hookFunc: (context: HookContext) => Promisable<undefined | HookContext>
) => {
  return (context) => {
    if (context.params && context.params.skipHooks) {
      const { skipHooks } = context.params;
      if (!Array.isArray(skipHooks)) {
        throw new GeneralError(
          "The `skipHooks` param must be an Array of Strings"
        );
      }
      if (
        skipHooks.includes(hookName) ||
        skipHooks.includes("all") ||
        (skipHooks.includes("before") && context.type === "before") ||
        (skipHooks.includes("after") && context.type === "after")
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
