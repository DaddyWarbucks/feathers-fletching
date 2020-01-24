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
const serializer = async (item, virtuals, context, prepResult) => {
  const updated = Object.assign({}, item);
  for (const key of Object.keys(virtuals)) {
    if (typeof virtuals[key] === 'function') {
      const result = await Promise.resolve(
        virtuals[key](updated, context, prepResult)
      );
      if (result !== undefined) {
        updated[key] = result;
      }
    } else {
      updated[key] = virtuals[key];
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
