module.exports.omit = (obj, ...keys) => {
  const result = Object.assign({}, obj);
  keys.forEach(key => delete result[key]);
  return result;
};

module.exports.pick = (obj, ...keys) => {
  return keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }

    return result;
  }, {});
};
