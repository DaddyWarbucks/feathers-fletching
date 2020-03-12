const { isPromise } = require('./utils');

// This serializer is a bit different from the virtualsSerializer
// because it does append the result to the object even if the
// function returned `undefined`. This is because it is used
// as a "filter" where each function result returns a truth/falsy
// value indicating if it should be filtered, and `undefined` is falsy
// and should be respected as a valid returned value

const resolve = async (virtuals, key, updated, context, prepResult) => {
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

module.exports.filterSerializer = async (
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
      data.map(item => serializer(item, virtuals, context, prepResult))
    );
  }
  return serializer(data, virtuals, context, prepResult);
};

module.exports.asyncFilterSerializer = async (
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
      data.map(item => asyncSerializer(item, virtuals, context, prepResult))
    );
  }
  return asyncSerializer(data, virtuals, context, prepResult);
};
