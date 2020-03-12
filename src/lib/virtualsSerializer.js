// The serializer funtion used for withData, withQuery and withResult.
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

// Note we try to avoid adding promises to the event loop when not
// neccessary by using `typeof result.then` instead of just
// await Promise.resolve(virtuals[key](updated, context, prepResult))

// Mutate the data at updated[key] in place according to its virtual.
const resolve = async (virtuals, key, updated, context, prepResult) => {
  if (typeof virtuals[key] === 'function') {
    let result = virtuals[key](updated, context, prepResult);
    if (typeof result.then === 'function') {
      result = await result.then(result => result);
    }
    if (result !== undefined) {
      updated[key] = result;
    }
  } else {
    updated[key] = virtuals[key];
  }
};

// Iterate over the keys syncronously
const serializer = async (item, virtuals, context, prepResult) => {
  const updated = Object.assign({}, item);
  for (const key of Object.keys(virtuals)) {
    await resolve(virtuals, key, updated, context, prepResult);
  }
  return updated;
};

// Iterate over the keys asyncronously
const asyncSerializer = async (item, virtuals, context, prepResult) => {
  const updated = Object.assign({}, item);
  await Promise.all(
    Object.keys(virtuals).map(key => {
      return resolve(virtuals, key, updated, context, prepResult);
    })
  );
  return updated;
};

module.exports.virtualsSerializer = async (
  data,
  virtuals,
  context,
  prepFunc = () => {}
) => {
  let prepResult = prepFunc(context);
  if (prepResult && typeof prepResult.then === 'function') {
    prepResult = await prepResult.then(result => result);
  }
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => serializer(item, virtuals, context, prepResult))
    );
  }
  return serializer(data, virtuals, context, prepResult);
};

module.exports.asyncVirtualsSerializer = async (
  data,
  virtuals,
  context,
  prepFunc = () => {}
) => {
  let prepResult = prepFunc(context);
  if (prepResult && typeof prepResult.then === 'function') {
    prepResult = await prepResult.then(result => result);
  }
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => asyncSerializer(item, virtuals, context, prepResult))
    );
  }
  return asyncSerializer(data, virtuals, context, prepResult);
};
