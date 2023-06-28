import type { HookContext } from "@feathersjs/feathers";
import type { Promisable } from "./utils";
import { isPromise } from "./utils";

// Note we try to avoid adding promises to the event loop when not
// neccessary by using `typeof result.then` instead of just
// await Promise.resolve(virtuals[key](updated, context, prepResult))

// The resolve funtion used for withData, withQuery and withResult.
// This function iterates the keys of the `virtuals` and assigns
// the value to that key as the result of some value or function.
/*
  {
    thing: 1, // return some primitive such as a number, bool, obj, string, etc
    thingFunc: (item, context, prepResult) => {
      // Return the result of a function that was give the args
      // item, the whole context, and the result of the prepFunction
      return item + context.params.itemToAdd
    },
    users: (item, context, prepResult) => {
      // Return a promise
      return context.app.service('users').get(item.user_id)
    }
  }
*/

// Mutate the data at updated[key] in place according to its virtual.
export const resolver = (
  virtual: any,
  key: string,
  updated: any,
  context: HookContext,
  prepResult: any
) => {
  if (typeof virtual === "function") {
    const result = virtual(updated, context, prepResult);
    if (isPromise(result)) {
      return result.then((result) => {
        if (typeof result !== "undefined") {
          updated[key] = result;
        }
      });
    }
    if (typeof result !== "undefined") {
      updated[key] = result;
      return result;
    }
    return result;
  } else {
    updated[key] = virtual;
    return virtual;
  }
};

// This serializer is a bit different from the other resolve
// because it does append the result to the object even if the
// function returned `undefined`. This is because it is used
// as a "filter" where each function result returns a truth/falsy
// value indicating if it should be filtered, and `undefined` is falsy
// and should be respected as a valid returned value
export const filterResolver = (
  virtual: any,
  key: string,
  updated: any,
  context: HookContext,
  prepResult: any
) => {
  if (typeof virtual === "function") {
    const result = virtual(updated, context, prepResult);
    if (isPromise(result)) {
      return result.then((shouldKeep) => {
        if (!shouldKeep) {
          delete updated[key];
        }
      });
    } else {
      if (!result) {
        delete updated[key];
      }
      return result;
    }
  } else {
    if (!virtual) {
      delete updated[key];
    }
    return virtual;
  }
};

const serializer = async (item, virtuals, context, prepResult, resolver) => {
  const updated = Object.assign({}, item);

  const syncKeys = [];
  const asyncKeys = [];
  Object.keys(virtuals).forEach((key) => {
    (key.startsWith("@") ? syncKeys : asyncKeys).push(key);
  });

  if (syncKeys.length) {
    for (const key of syncKeys) {
      const result = resolver(
        virtuals[key],
        key.substring(1),
        updated,
        context,
        prepResult
      );
      if (isPromise(result)) {
        await result;
      }
    }
  }

  if (asyncKeys.length) {
    const results = asyncKeys.map((key) => {
      return resolver(virtuals[key], key, updated, context, prepResult);
    });
    if (results.some((result) => isPromise(result))) {
      await Promise.all(results.filter((result) => isPromise(result)));
    }
  }

  return updated;
};

export const virtualsSerializer = async (
  resolver,
  data,
  virtuals,
  context: HookContext,
  prepFunc: (context?: HookContext) => Promisable<any> = () => {}
) => {
  let prepResult = prepFunc(context);
  if (isPromise(prepResult)) {
    prepResult = await prepResult.then((result) => result);
  }

  if (Array.isArray(data)) {
    return Promise.all(
      data.map((item) =>
        serializer(item, virtuals, context, prepResult, resolver)
      )
    );
  }

  return serializer(data, virtuals, context, prepResult, resolver);
};
