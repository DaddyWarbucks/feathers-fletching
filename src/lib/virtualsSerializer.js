const { isPromise } = require('./utils');

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
const resolver = (module.exports.resolver = async (
  virtuals,
  key,
  updated,
  context,
  prepResult
) => {
  if (typeof virtuals[key] === 'function') {
    let result = virtuals[key](updated, context, prepResult);
    if (isPromise(result)) {
      result = await result.then(result => result);
    }
    if (result !== undefined) {
      updated[key] = result;
    }
  } else {
    updated[key] = virtuals[key];
  }
});

// This serializer is a bit different from the other resolve
// because it does append the result to the object even if the
// function returned `undefined`. This is because it is used
// as a "filter" where each function result returns a truth/falsy
// value indicating if it should be filtered, and `undefined` is falsy
// and should be respected as a valid returned value
const filterResolver = (module.exports.filterResolver = async (
  virtuals,
  key,
  updated,
  context,
  prepResult
) => {
  let shouldKeep;
  if (typeof virtuals[key] === 'function') {
    shouldKeep = virtuals[key](updated, context, prepResult);
    if (isPromise(shouldKeep)) {
      shouldKeep = await shouldKeep.then(result => result);
    }
  } else {
    shouldKeep = virtuals[key];
  }

  if (!shouldKeep) {
    delete updated[key];
  }
});

const serializer = async (item, virtuals, context, prepResult, resolver) => {
  const updated = Object.assign({}, item);

  const syncKeys = [];
  const asyncKeys = [];
  Object.keys(virtuals).forEach(key => {
    (key.startsWith('@') ? syncKeys : asyncKeys).push(key);
  });

  if (syncKeys.length) {
    for (const key of syncKeys) {
      await resolver(virtuals, key, updated, context, prepResult);
    }
  }

  if (asyncKeys.length) {
    await Promise.all(
      asyncKeys.map(key => {
        return resolver(virtuals, key, updated, context, prepResult);
      })
    );
  }

  return updated;
};

module.exports.virtualsSerializer = async (
  resolver,
  data,
  virtuals,
  context,
  prepFunc = () => {}
) => {
  let prepResult = prepFunc(context);
  if (isPromise(prepResult)) {
    prepResult = await prepResult.then(result => result);
  }

  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item =>
        serializer(item, virtuals, context, prepResult, resolver)
      )
    );
  }

  return serializer(data, virtuals, context, prepResult, resolver);
};
