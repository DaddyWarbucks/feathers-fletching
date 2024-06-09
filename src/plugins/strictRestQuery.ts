import type { Application } from '@feathersjs/feathers';
import qs from 'qs';

// Parse string numbers and booleans into proper types
// See: https://github.com/ljharb/qs/issues/91
const decoder = (str: string, decoder, charset) => {
  const strWithoutPlus = str.replace(/\+/g, ' ');

  if (charset === 'iso-8859-1') {
    // unescape never throws, no try...catch needed:
    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
  }

  if (/^(\d+|\d*\.\d+)$/.test(str)) {
    return parseFloat(str);
  }

  const keywords = {
    true: true,
    false: false
  };

  if (str in keywords) {
    return keywords[str];
  }

  // utf-8
  try {
    return decodeURIComponent(strWithoutPlus);
  } catch (e) {
    return strWithoutPlus;
  }
};

export type StrictRestQueryOptions = {
  arrayLimit?: number;
  depth?: number;
  parameterLimit?: number;
  strictNullHandling?: boolean;
};

export const strictRestQueryPlugin = (opts: StrictRestQueryOptions = {}) => {
  return (app: Application) => {
    const options = Object.assign(
      {
        arrayLimit: 100,
        depth: 20,
        parameterLimit: 2000,
        strictNullHandling: true,
        decoder
      },
      opts
    );

    app.set('query parser', (str) => qs.parse(str, options));

    return app;
  };
};
