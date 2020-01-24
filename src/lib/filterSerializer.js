const virtualsSerializer = require('./virtualsSerializer');
const { omit, pick } = require('./utils');

// This serializer is a bit different from the virtualsSerializer
// because it does append the result to the object even if the
// function returned `undefined`. This is because it is used
// as a "filter" where each function result returns a truth/falsy
// value indicating if it should be filtered, and `undefined` is falsy
// and should be respected as a valid returned value
const serializer = async (item, virtuals, context, prepResult) => {
  const updated = Object.assign({}, item);
  for (const key of Object.keys(virtuals)) {
    let shouldKeep;
    if (typeof virtuals[key] === 'function') {
      shouldKeep = await Promise.resolve(
        virtuals[key](updated, context, prepResult)
      );
    } else {
      shouldKeep = virtuals[key];
    }

    if (!shouldKeep) {
      delete updated[key];
    }
  }
  return updated;
};

module.exports = async (data, virtuals, context, prepFunc) => {
  const prepResult = await Promise.resolve(prepFunc(context));
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => serializer(item, virtuals, context, prepResult))
    );
  }
  return serializer(data, virtuals, context, prepResult);
};
