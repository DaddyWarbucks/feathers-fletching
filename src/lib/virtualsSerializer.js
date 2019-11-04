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
module.exports = async (item, virtuals, context, prepResult) => {
  const updated = {
    ...item
  };
  for (const key of Object.keys(virtuals)) {
    if (typeof virtuals[key] === 'function') {
      updated[key] = await Promise.resolve(
        virtuals[key](updated, context, prepResult)
      );
    } else {
      updated[key] = virtuals[key];
    }
    if (updated[key] === undefined) {
      delete updated[key];
    }
  }
  return updated;
};