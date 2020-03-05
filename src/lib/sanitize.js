const sanitize = (data, schema) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data, schema);
  }

  if (typeof data === 'number') {
    const string = data.toString();
    const replaced = sanitizeString(string, schema);
    // We must convert to string in order to replace
    // Try to return a number if possible, else return string
    const number = Number(replaced);
    if (isNaN(number)) {
      return replaced;
    } else {
      return number;
    }
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item, schema));
  }

  if (data instanceof Error) {
    return Object.getOwnPropertyNames(data).reduce((result, key) => {
      result[key] = sanitize(data[key], schema);
      return result;
    }, data);
  }

  if (typeof data === 'object') {
    return Object.keys(data).reduce((result, key) => {
      result[key] = sanitize(data[key], schema);
      return result;
    }, {});
  }

  return data;
};

const sanitizeString = (string, schema) => {
  return Object.keys(schema).reduce((sanitized, key) => {
    if (typeof schema[key] === 'function') {
      return schema[key](sanitized, key);
    } else {
      return sanitized.replace(key, schema[key]);
    }
  }, string);
};

module.exports = sanitize;
