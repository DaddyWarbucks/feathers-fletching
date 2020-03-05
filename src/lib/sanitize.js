const sanitize = (result, schema) => {
  if (result === null || result === undefined) {
    return result;
  }

  if (typeof result === 'string') {
    return sanitizeString(result, schema);
  }

  if (typeof result === 'number') {
    const string = result.toString();
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

  if (Array.isArray(result)) {
    return result.map(item => sanitize(item, schema));
  }

  if (result instanceof Error) {
    return Object.getOwnPropertyNames(result).reduce((sanitized, key) => {
      sanitized[key] = sanitize(result[key], schema);
      return sanitized;
    }, result);
  }

  if (typeof result === 'object') {
    return Object.keys(result).reduce((sanitized, key) => {
      sanitized[key] = sanitize(result[key], schema);
      return sanitized;
    }, {});
  }

  return result;
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
