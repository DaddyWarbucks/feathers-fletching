import unset from "unset-value";

export const omit = <
  O extends Record<string, any>,
  Keys extends (keyof O)[] = (keyof O)[]
>(
  obj: O,
  keys: Keys
): Omit<O, Keys[number]> => {
  const result = Object.assign({}, obj);
  keys.forEach((key) => unset(result, key));
  return result;
};

export const pick = <
  O extends Record<string, any>,
  Keys extends (keyof O)[] = (keyof O)[]
>(
  obj: O,
  ...keys: Keys
): Pick<O, Keys[number]> =>
  keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }

    return result;
  }, {} as Pick<O, Keys[number]>);

export const isPromise = <P>(maybePromise: P): maybePromise is Promise<any> => {
  const isPromise = maybePromise && typeof maybePromise.then === "function";
  return !!isPromise;
};

export const isObject = (obj): obj is Record<string, any> => {
  return obj && typeof obj === "object" && !Array.isArray(obj);
};

export const isEmpty = (obj) => {
  if (Array.isArray(obj)) {
    return obj.length === 0;
  }
  return Object.keys(obj).length === 0;
};

export const hasKey = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

export const hasQuery = (context) => {
  const hasQuery =
    context.params && context.params.query && !isEmpty(context.params.query);

  return !!hasQuery;
};

export const getResults = (context) => {
  return context.method === "find"
    ? context.result.data || context.result
    : context.result;
};

export const replaceResults = (context, results) => {
  if (context.method === "find") {
    if (context.result && context.result.data) {
      context.result.data = Array.isArray(results) ? results : [results];
    } else {
      context.result = Array.isArray(results) ? results : [results];
    }
  } else {
    context.result = results;
  }
};

export const stableStringify = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "function") {
      throw new Error("Cannot stringify non JSON value");
    }

    if (isObject(value)) {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = value[key];
          return result;
        }, {});
    }

    return value;
  });
};

// This is mainly meant to traverse queries and is not
// meant to be a feature rich traversal. It calls
// the callback for any key/value in any nested objects.
// It does not account for Map, Set, etc.
export const traverse = (obj, callback) => {
  if (!isObject(obj)) {
    return obj;
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((childObj) => traverse(childObj, callback));
    }
    if (isObject(value)) {
      traverse(value, callback);
    }
    return callback(obj, [key, value]);
  });

  return obj;
};

export const asyncTraverse = async (obj, callback) => {
  if (!isObject(obj)) {
    return obj;
  }

  await Promise.all(
    Object.entries(obj).map(async ([key, value]) => {
      if (Array.isArray(value)) {
        await Promise.all(
          value.map((childObj) => asyncTraverse(childObj, callback))
        );
      }
      if (isObject(value)) {
        await asyncTraverse(value, callback);
      }
      return callback(obj, [key, value]);
    })
  );

  return obj;
};

// https://github.com/angus-c/just/blob/master/packages/collection-clone/index.js
export const clone = (obj) => {
  if (typeof obj == "function") {
    return obj;
  }
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    // include prototype properties
    const value = obj[key];
    const type = {}.toString.call(value).slice(8, -1);
    if (type == "Array" || type == "Object") {
      result[key] = clone(value);
    } else if (type == "Date") {
      result[key] = new Date(value.getTime());
    } else if (type == "RegExp") {
      result[key] = RegExp(value.source, getRegExpFlags(value));
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const getRegExpFlags = (regExp) => {
  if (typeof regExp.source.flags == "string") {
    return regExp.source.flags;
  } else {
    const flags = [];
    regExp.global && flags.push("g");
    regExp.ignoreCase && flags.push("i");
    regExp.multiline && flags.push("m");
    regExp.sticky && flags.push("y");
    regExp.unicode && flags.push("u");
    return flags.join("");
  }
};

export type Promisable<T> = T | Promise<T>;
