import assert from 'assert';
import {sanitize} from '../../src/utils';
import {sanitizeResult} from '../../src';
import {sanitizeError} from '../../src';

describe('sanitize', () => {
  const API_KEY = '12345';
  const schemaResult = '*****';

  const schema = {
    [API_KEY]: schemaResult
  };

  it('Sanitizes objects', async () => {
    const result = {
      sensitiveKey: API_KEY
    };
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual({ sensitiveKey: schemaResult }, sanitized);
  });

  it('Sanitizes strings', async () => {
    const result = API_KEY;
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual(schemaResult, sanitized);
  });

  it('Sanitizes arrays', async () => {
    const result = [API_KEY];
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual([schemaResult], sanitized);
  });

  it('Sanitizes errors', async () => {
    const result = new Error(API_KEY);
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual(schemaResult, sanitized.message);
  });

  it('Sanitizes numbers', async () => {
    const result = 123;
    const schema = {
      123: schemaResult
    };
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual(schemaResult, sanitized);
  });

  it('Returns numbers when it can', async () => {
    const result = 123;
    const schema = {
      123: 456
    };
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual(sanitized, 456);
  });

  it('Sanitizes deeply nested objects', async () => {
    const result = {
      string: API_KEY,
      arrayOfStrings: [API_KEY],
      arrayOfObjects: [
        {
          string: API_KEY,
          array: [API_KEY],
          objArray: [{ string: API_KEY }]
        }
      ],
      object: {
        string: API_KEY
      }
    };

    const sanitized = sanitize(result, schema);

    const expected = {
      string: schemaResult,
      arrayOfStrings: [schemaResult],
      arrayOfObjects: [
        {
          string: schemaResult,
          array: [schemaResult],
          objArray: [{ string: schemaResult }]
        }
      ],
      object: {
        string: schemaResult
      }
    };

    await assert.deepStrictEqual(expected, sanitized);
  });

  it('Can use a function in the schema', async () => {
    const result = API_KEY;
    const schema = {
      [API_KEY]: (string, key) => 'functionUsed'
    };
    const sanitized = sanitize(result, schema);
    await assert.deepStrictEqual(sanitized, 'functionUsed');
  });

  it('Can use a function to create the schema', async () => {
    const resultContext = {
      result: API_KEY
    };

    const errorContext = {
      error: API_KEY
    };

    const schemaFunc = context => {
      return {
        [API_KEY]: schemaResult
      };
    };

    const resultHook = sanitizeResult(schemaFunc);
    const newResultContext = await resultHook(resultContext);

    const errorHook = sanitizeError(schemaFunc);
    const newErrorContext = await errorHook(errorContext);

    await assert.deepStrictEqual(newResultContext.result, schemaResult);
    await assert.deepStrictEqual(newErrorContext.error, schemaResult);
  });

  it('Does not sanitize an error.hook prop', async () => {
    const errorContext = {
      error: API_KEY,
      hook: {
        error: API_KEY
      }
    };

    const errorHook = sanitizeError(schema);
    const newErrorContext = await errorHook(errorContext);

    await assert.deepStrictEqual(newErrorContext.hook.error, API_KEY);
  });
});
