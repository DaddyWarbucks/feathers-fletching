module.exports = map => {
  return {
    get: (key, context) => {
      const { query = {} } = context.params || {};
      if (!Object.keys(query).length) {
        return map.get(key, context);
      }
    },
    set: (key, result, context) => {
      const { query = {} } = context.params || {};
      if (!query.$select) {
        return map.set(key, result, context);
      }
    },
    delete: (key, context) => {
      return map.delete(key, context);
    }
  };
};
