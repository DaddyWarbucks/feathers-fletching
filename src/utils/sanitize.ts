export type SanitizeSchema = {
  [key: string]: string | ((str: string, key: any) => string);
};

export const sanitize = (result: any, schema: SanitizeSchema) => {
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
    return result.map((item) => sanitize(item, schema));
  }

  if (result instanceof Error) {
    // Errors often contain a `hook` property that holds
    // context of the error. This can create a circular
    // reference back to this error which creates an
    // infinite loop. Hook is serialized off the error before
    // going to the client anyway, so not need to sanitize it
    if ('hook' in result) {
      const { hook } = result;
      delete result.hook;
      const error = Object.getOwnPropertyNames(result).reduce(
        (sanitized, key) => {
          sanitized[key] = sanitize(result[key], schema);
          return sanitized;
        },
        result
      );
      error.hook = hook;
      return error;
    } else {
      return Object.getOwnPropertyNames(result).reduce((sanitized, key) => {
        sanitized[key] = sanitize(result[key], schema);
        return sanitized;
      }, result);
    }
  }

  if (typeof result === 'object') {
    return Object.keys(result).reduce((sanitized, key) => {
      sanitized[key] = sanitize(result[key], schema);
      return sanitized;
    }, {});
  }

  return result;
};

const sanitizeString = (string: string, schema: SanitizeSchema) => {
  return Object.keys(schema).reduce((sanitized, key) => {
    const val = schema[key];
    if (typeof val === 'function') {
      return val(sanitized, key);
    } else {
      return sanitized.replace(key, val);
    }
  }, string);
};
