const assert = require('assert');
const sanitize = require('../../src/lib/sanitize');
const sanitizeData = require('../../src/hooks/sanitizeData');

describe('sanitize', () => {
  it('Sanitizes objects', async () => {
    const data = {
      sensitiveKey: 'myApiKey'
    };

    const schema = {
      myApiKey: '${MY_API_KEY}'
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual({ sensitiveKey: '${MY_API_KEY}' }, sanitized);
  });

  it('Sanitizes strings', async () => {
    const data = 'myApiKey';

    const schema = {
      myApiKey: '${MY_API_KEY}'
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual('${MY_API_KEY}', sanitized);
  });

  it('Sanitizes arrays', async () => {
    const data = ['myApiKey'];

    const schema = {
      myApiKey: '${MY_API_KEY}'
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual(['${MY_API_KEY}'], sanitized);
  });

  it('Sanitizes errors', async () => {
    const data = new Error('myApiKey');

    const schema = {
      myApiKey: '${MY_API_KEY}'
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual('${MY_API_KEY}', sanitized.message);
  });

  it('Sanitizes numbers', async () => {
    const data = 123;

    const schema = {
      123: '${MY_API_KEY}'
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual('${MY_API_KEY}', sanitized);
  });

  it('Returns numbers when it can', async () => {
    const data = 123;

    const schema = {
      123: 456
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual(sanitized, 456);
  });

  it('Sanitizes deeply nested objects', async () => {
    const data = {
      string: 'myApiKey',
      arrayOfStrings: ['myApiKey'],
      arrayOfObjects: [
        {
          string: 'myApiKey',
          array: ['myApiKey'],
          objArray: [{ string: 'myApiKey' }]
        }
      ],
      object: {
        string: 'myApiKey'
      }
    };

    const schema = {
      myApiKey: '${MY_API_KEY}'
    };

    const sanitized = sanitize(data, schema);

    const expected = {
      string: '${MY_API_KEY}',
      arrayOfStrings: ['${MY_API_KEY}'],
      arrayOfObjects: [
        {
          string: '${MY_API_KEY}',
          array: ['${MY_API_KEY}'],
          objArray: [{ string: '${MY_API_KEY}' }]
        }
      ],
      object: {
        string: '${MY_API_KEY}'
      }
    };

    await assert.deepStrictEqual(expected, sanitized);
  });

  it('Can use a function in the schema', async () => {
    const data = 'myApiKey';

    const schema = {
      myApiKey: (string, key) => 'functionUsed'
    };

    const sanitized = sanitize(data, schema);

    await assert.deepStrictEqual(sanitized, 'functionUsed');
  });

  it('Can use a function to create the schema', async () => {
    const context = {
      data: 'myApiKey'
    };

    const schemaFunc = context => {
      return {
        myApiKey: '${MY_API_KEY}'
      };
    };

    const sanitizer = sanitizeData(schemaFunc);

    const newContext = await sanitizer(context);

    await assert.deepStrictEqual(newContext.data, '${MY_API_KEY}');
  });
});
