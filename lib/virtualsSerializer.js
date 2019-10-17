// The serializer funtion used for withData, withQuery and withResult.
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