# Hooks
<!--
**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| | | | | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/...) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| | | | |  |

-->

## Notes
All feathers-fletching hooks are skippable by default. This means that each hook can be skipped by calling a service with the param `skipHooks` as an array of the names of the feathers-fletching hooks that you want to skip. See also the `skippable` utils function docs on how to make your own hooks, or other library hooks, skippable as well.
```js
app.service('albums').find({ skipHooks: ['withResult'] });
```

## withResult

Add or overwrite properties onto the `context.result` or `context.result.data`. Useful for joining/populating records and creating virtual properties.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| no | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withResult.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| virtuals | Object |  | true | An object where each key will be the name of a property to be added to the `context.result` and each value is either a primitive, function, or promise. |
| prepFunc | Function/Promise | () => {} | false | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object. |

```js
import { withResult } from 'feathers-fletching';

/*
  context.result = {
    title: 'The Man in Black',
    description: 'One of the all time greats!',
    artist_id: 123
  }
*/

const withResults = withResult({

  status: 'platinum', // return some primitive: number, bool, obj, string, etc

  summary: (result, context, prepResult) => {
    // Return the result of a function that was given the args
    // result, context, prepResult
    return result.description.substring(0, 3) + '...';
  },

  artist: (result, context, prepResult) => {
    // Return a promise. Useful for populating/joining records
    return context.app.service('artists').get(result.artist_id);
  },

  artist_profile: (result, context, prepResult) => {
    // Keys are iterated over syncronously in order of their definition.
    // This means that `status`, `summary`, and `artist` will all be present
    // by the time this `artist_profile` virtual is run. We can use the
    // `artist` virtual here because it has already been populated
    if (artist.is_public) {
      return context.app.service('profiles').find({
        query: { artist_id: result.artist_id }
      });
    } else {
      return null;
    }
  },

  whoops: (result, context, prepResult) => {
    // If undefined is returned, this key will not be on the result at all.
    // It will not be { whoops: undefined }, instead the `whoops` is deleted
    // from the object totally.
    return undefined;
  }

});

/*
  context.result = {
    title: 'The Man in Black',
    body: 'One of the all time greats!',
    artist_id: 123,
    status: 'platinum',
    summary: 'One...'
    artist: { { name: 'Johnny Cash' } },
    artist_profile: null
  }
*/

// withResult takes a second argument `prepFunc`. This function/promise is run
// before iteration over the virtuals keys and is passed to each
// virtuals function. It is useful for doing operations that will be
// used by multiple virtuals.

/*
  context.result = {
    status: 'processing'
  }
*/
const withResults = withResult({

  status_code: (result, context, statuses) => {
    const currentStatus = statuses.find(status => status.name === result.status);
    return currentStatus.code;
  },

  next_status_code: (result, context, statuses) => {
    const currentIndex = statuses.findIndex(
      status => status.name === result.status
    );
    return currentIndex + 1;
  }

},

  async context => {
    // This function is run before iterating over the virtuals object and its
    // result is passed to each virtuals function.
    const statuses = await context.app.service('statuses').find();
    // [{ name: 'pocessing', code: 123 }, { name: 'done', code: 456 }]
    return statuses;
  }

);

/*
  context.result = {
    status: 'processing',
    status_code: 123,
    next_status_code: 456
  }
*/
```

- Virtuals functions are run syncronously in order of their key definition in the `virtuals` object.

- If the result set is an array, then the `result` arg in each virtuals function `(result, context, prepResult) => {}` is the individual item in that array, not the whole array.

- When the result set is an array, the withResult virtuals are applied to each item in the array and this is run asyncrounously via `Promise.all()`.

## withoutResult

Remove properties from the `context.result` or `context.result.data` of a method call. This can be used similar to a "protect" hook.

If you think of `withResult` (or any of the `with*` hooks) similar to `Array.protype.map`, you can think of the `withoutResult` (or any of the `without*` hooks) as similar to `Array.protype.filter`.

For each virtual in the virtual object, if the value returns a truthy value it will be kept and if it returns a falsey value it will be filtered.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| no | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withoutResult.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| virtuals | Object |  | true | An object where each key will be the name of a property to be potentially filtered from result. **Return a truthy value to keep the value and return a falsey value to remove it**. |
| prepFunc | Function/Promise | () => {} | false | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object. |

```js
import { withoutResult } from 'feathers-fletching';

/*
  context.result = {
    name: 'Johnny Cash',
    ssn: 123456789,
    email: 'jcash@example.com'
  }
*/

const withoutResults = withoutResult({

  // simply pass false if you don't need to do any logic
  // and this property will be filtered
  ssn: false,

  // Similar to all of the with* and without* hooks, you
  // can use a function/promise with `result`, `context`, `prepResult` args
  email: (result, context, prepResult) => {
    return context.params.user.role === 'admin';
  }

});

/*
  // if authenticated user is admin
  context.result = {
    name: 'Johnny Cash',
    email: 'jcash@example.com'
  }

  // if authenticated user is NOT admin
  context.result = {
    name: 'Johnny Cash'
  }
*/
```

## withData

Add or overwrite properties to the `context.data` of a method call. Useful for adding default data, creating joined data, and adding server side rules to data.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withData.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| virtuals | Object |  | true | An object where each key will be the name of a property to be added to the `context.data` and each value is either a primitive, function, or promise. |
| prepFunc | Function/Promise | () => {} | false | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object. |

```js
import { withData } from 'feathers-fletching';

/*
  context.data = {
    user_id: 456,
    email: '    JCASH@EXAMPLE.COM',
    category_ids: [123],
    categories: [{ title: 'Country' }, { title: 'Western' }]
  }
*/

const withDatas = withData({

  // This hook is useful for forcing properties onto data that
  // the client should not have control of. For example, you
  // may always force the `user_id` onto a record from the
  // `context.params.user` to ensure that the `user_id` is
  // always from the authorized user instead of trusting the
  // client to send the proper `user_id`. Even if the client
  // sends `{ user_id: 456 }` which is some other user's id,
  // this hook will overwrite that `user_id` to ensure the
  // data cannot be spoofed.
  user_id: (data, context, prepResult) => context.params.user.id,

  // You can also use this hook to sanitize data by overwriting
  // data that already exists.
  email: (data, context, prepResult) => {
    return data.email.trim().toLowerCase();
  },

  // You can also use this hook to create or update "joined"
  // records. Allow the client to pass joined records as
  // an array, and you can handle updating them.
  category_ids: async (data, context, prepResult) => {
    if (data.catgories) {

      const promises = data.categories.map(newCat => {
        return context.app.service('categories').create(newCat);
      });

      const newCategories = await Promise.all(promises);
      const newCategoryIds = newCategories.map(newCat => newCat.id);

      delete data.categories;

      return [...data.category_ids, ...newCategoryIds]
    }

    return data.category_ids;
  }
});

/*
  context.data = {
    user_id: 123,
    email: 'jcash@example.com',
    category_ids: [123, 456, 789]
  }
*/
```

## withoutData

Remove properties from the `context.data` of a method call. This hook can be used similar to a "preventChange" hook.

If you think of `withData` (or any of the `with*` hooks) similar to `Array.protype.map`, you can think of the `withoutData` (or any of the `without*` hooks) as similar to `Array.protype.filter`.

For each virtual in the virtual object, if the value returns a truthy value it will be kept and if it returns a falsey value it will be filtered.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withoutData.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| virtuals | Object |  | true | An object where each key will be the name of a property to be potentially filtered from data. **Return a truthy value to keep the value and return a falsey value to remove it**. |
| prepFunc | Function/Promise | () => {} | false | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object. |

```js
import { withoutData } from 'feathers-fletching';

/*
  context.data = {
    name: 'Johnny Cash',
    ssn: 123456789,
    email: 'themaninblack@example.com'
  }
*/

const withoutDatas = withoutData({

  // Simply pass false if you don't need to do any logic
  // and this property will be filtered
  ssn: false,

  // Similar to all of the with* and without* hooks, you
  // can use a function/promise with `result`, `context`, `prepResult` args
  email: (data, context, prepResult) => {
    return context.params.user.role === 'admin';
  }
});

/*
  // if authenticated user is admin
  context.data = {
    name: 'Johnny Cash',
    email: 'themaninblack@example.com'
  }

  // if authenticated user is NOT admin
  context.data = {
    name: 'Johnny Cash'
  }
*/

```

## withQuery

Add or overwrite properties to the `context.params.query` of a method call. This hook is useful for creating "ACL" rules by enforicing some queries are only added via the server.

This hook is also useful for offering the client a simple query interface that you can then use to create more complicated queries.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withQuery.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| virtuals | Object |  | true | An object where each key will be the name of a property to be added to the `context.params.query` and each value is either a primitive, function, or promise. |
| prepFunc | Function/Promise | () => {} | false | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object. |

```js
import { withQuery } from 'feathers-fletching';
import { startOf, endOf } from 'some-date-lib';

/*
  context.params.query = {
    user_id: 456,
    $period: 'week'
  }
*/

const withQueries = withQuery({

  // This hook is useful for forcing properties onto query that
  // the client should not have control of. For example, you
  // may always force the `user_id` onto a query from the
  // `context.params.user` to ensure that only records created
  // by this user are returned. Even if the client sends
  // `{ user_id: 456 }` which is some other user's id, this
  // hook will overwrite that `user_id` to ensure the query
  // cannot be spoofed.
  user_id: (data, context, prepResult) => context.params.user.id,

  // Give the client an easier query interface by allowing simple
  // query params that can be used to create complicated queries.
  created_at: (data, context) => {
    // $period is a made up query param that we are offering the client.
    // The feathers-database-adapters will throw an error if they receive
    // this parameter, so we will use it to create a real query and then
    // delete the "fake" query.
    const { $period } = context.params.query;
    if ($period) {
      // Delete the "fake" parameter
      delete context.params.query.$period;
      // Return some actual query
      return { $gte: startOf($period), $lte: endOf($period) }
    }
  }
});

/*
  context.params.query = {
    user_id: 123,
    created_at: { $gte: ...some date, $lte: ...some date }
  }
*/
```

## withoutQuery

Remove properties from the `context.params.query` of a method call.  See the [withoutResult](#withoutResult) docs for more detailed info about how virtuals and prepFunc work in the `without*` hooks.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withoutQuery.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| virtuals | Object |  | true | An object where each key will be the name of a property to be potentially filtered from `context.params.query`. **Return a truthy value to keep the value and return a falsey value to remove it**. |
| prepFunc | Function/Promise | () => {} | false | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object. |

```js
import { withoutQuery } from 'feathers-fletching';

/*
  context.params.query = {
    name: 'Johnny Cash',
    ssn: 123456789
  }
*/

const withoutQueries = withoutQuery({
  ssn: (data, context, prepResult) => {
    // If the authenticated user is an admin,
    // they can query by ssn
    return context.params.user.role === 'admin';
  }
});

/*
  // if authenticated user is admin
  context.params.query = {
    name: 'Johnny Cash',
    role: 123456789
  }

  // if authenticated user is NOT admin
  context.params.query = {
    name: 'Johnny Cash'
  }
*/

```

## joinQuery

Query across services for "joined" records on any database type. This hook relies on the service interface, rather than the database, to query across services allowing you to query similar to a relational database even on services that are NoSQL or even those that do not have a database at all.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/joinQuery.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| options | Object |  | true | An object where each key will be the name of a  query prop the client can use and each value defines the service and ids  |
| option.service | String |  | true | The string name of the service to query against |
| option.targetKey | String |  | true | The name of the key that exists on the collection this service is querying |
| option.foreignKey | String |  | true | The name of the key on the foreign record. Generally this will be `id` or `_id` |
| option.makeParams | Function/Promise | `(defaultParams, context) => defaultParams` | false | A function/promise that returns params to be sent to the `option.service` find method. |
| option.makeKey | Function | `(key) => key`  | false | A function that parses the `option.targetKey` and `option.foreignKey` |


```js
import { joinQuery } from 'feathers-fletching';

/*

  "artists" collection via service `app.service('api/artists')`
  [
    { id: 123, name: 'Johnny Cash' },
    { id: 456, name: 'Johnny PayCheck' },
  ]

  "albums" collection via `app.service('api/albums')`
  [
    { title: 'The Man in Black', artist_id: 123 },
    { title: 'I Wont Back Down', artist_id: 123 },
    { title: 'Double Trouble', artist_id: 456 }
  ]
*/

const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    foreignKey: 'artist_id',
    targetKey: 'id'
  }
});

app.service('api/albums').hooks({
  before: {
    all: [joinQueries]
  },
  after: {
    // Use the hook as an after hook to sort by joined results.
    all: [joinQueries]
  }
});

// Notice how we are querying on the joined `artist` prop
// by passing it `{ name: 'Johnny Cash' }` which will only return
// albums where the artist's name is "Johnny Cash". You can pass
// any query here that you would normally pass to
// app.service('api/artists').find({ query: {...} })
const albums = await app.service('api/albums').find({
  query: {
    artist: { name: 'Johnny Cash' }
  }
});

/*
  context.params.query = {
    artist_id: { $in: [123] }
  }
*/

/*
  context.result = [
    { title: 'The Man in Black', artist_id: 123 },
    { title: 'I Wont Back Down', artist_id: 123 }
  ]
*/
```

```js
// Use the `makeKey` option to parse ids. This is required
// when working with mongo/mongoos ObjectID's. Generally if
// your service uses `_id` you probably want to do this.
const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    foreignKey: 'artist_id',
    targetKey: '_id'
    makeKey: key => key.toString()
  }
});
```

```js
// Use the `makeParams` option to pass additional params to the
// underlying find() to the option.service. Be sure to merge the
// defaultParams onto the result.
const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    foreignKey: 'artist_id',
    targetKey: 'id'
    makeParams: (defaultParams, context) => {
      /*
        defaultParams = {
          paginate: false,
          query: { $select: ['id'], { name: 'Johnny Cash' }  }
        }
      */
      return {
        ...defaultParams,
        user: context.params.user
      }
    }
  }
});
```

```js
// Use the hook as an after hook to sort results by the joined query.
// You are not required to use this hook after unless you want to sort.
const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    foreignKey: 'artist_id',
    targetKey: 'id'
  }
});

app.service('api/albums').hooks({
  before: {
    all: [joinQueries]
  },
  after: {
    all: [joinQueries]
  }
});

// Sort albums by artist name where the name is like 'John'
const albums = await app.service('api/albums').find({
  query: {
    artist: { name: { $like: 'John' }, $sort: { name: -1 } }
  }
});

/*
  context.params.query = {
    artist_id: { $in: [123, 456] }
  }
*/

/*
  context.result = [
    { title: 'Double Trouble', artist_id: 456 },
    { title: 'The Man in Black', artist_id: 123 },
    { title: 'I Wont Back Down', artist_id: 123 }
  ]
*/

```

> When using this hook on the client, use the [disablePagination](https://hooks-common.feathersjs.com/hooks.html#disablepagination) hook on the server to ensure proper results. Then be sure to include `$limit: -1` with your join query like `artist: { name: 'Johnny Cash', $limit: -1 }`. Otherwise, the query passed to the join service will not return all joined records and your result set will be incomplete.

## contextCache

Cache the results of `get()` and `find()` requests. Clear the cache on any other method.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/contextCache.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| cacheMap | Object |  | true | A Map like object where each method is passed `context` as the only argument. Methods can be async. |
| cacheMap.get | Function/Promise |  | true | Called before `get` and `find` |
| cacheMap.set | Function/Promise |  | true | Called after `get` and `find` |
| cacheMap.clear | Function/Promise |  | true | Called after `create`, `update`, `patch` and `remove` |


```js
import { contextCache } from 'feathers-fletching';
import LRU from 'lru-cache';

// Keep the 100 most recently used.
const map = new LRU({ max: 100 });

const makeKey = context => {
  return JSON.stringify({
    method: context.method,
    id: context.id,
    query: context.params.query
  });
};

const cache = contextCache({
  get: (context) => {
    // Called before `get()` and `find()`
    const key = makeKey(context);
    return map.get(key);
  },
  set: (context) => {
    // Called after `get()` and `find()`
    const key = makeKey(context);
    const result = JSON.parse(JSON.stringify(context.result));
    return map.set(key, result);
  },
  clear: (context) => {
    // Called after `create()`, `update()`, `patch()`, and `remove()`
    return map.reset();
  }
});

// The contextCache hook should be as "close" to the database as possibe.
// This means it should be the last before hook, and the first after hook.
module.exports = {
  before: {
    // Try to return from the cache before find and get
    find: [beforeHook1, cache],
    get: [beforeHook1, cache]
  },
  after: {
    // Cache results after find and get
    find: [cache, afterHook1],
    get: [cache, afterHook1]

    // Clear the cache on any mutating method
    create: [cache, afterHook1],
    update: [cache, afterHook1],
    patch: [cache, afterHook1],
    remove: [cache, afterHook1]
  }
}

service.find(); // No cache hit
service.find(); // Cache hit

service.find({ query: { name: 'Johnny' } }); // No cache hit
service.find({ query: { name: 'Johnny' } }); // Cache hit

service.get(1); // No cache hit
service.get(1); // Cache hit

service.get(1, { query: { name: 'Johnny' } }); // No cache hit
service.get(1, { query: { name: 'Johnny' } }); // Cache hit

service.create(); // Clears the entire cache
service.update(1, { 'Patsy' }); // Clears the entire cache
service.patch(1, { 'Patsy' }); // Clears the entire cache
service.remove(1); // Clears the entire cache
```

**Cache Strategy**

Before `get()` and `find()`, if the result exists in the cache it is returned.

After `get()` and `find()`, the results are stored in the cache.

After `create()`, `update()`, `patch()`, and `remove()` the cache is cleared.

**Custom Cache Maps**

The hook must be provided a custom `cacheMap` object to use as its memoization cache. Any object/class that implements `get(context)`, `set(context)`, and `clear(context)` methods can be provided and async methods are supported. This means that the cache can even be backed by redis, etc. This is also how you can customize key generation, cloning, and eviction policy.

The cache will grow without limit when using a standard javascript `Map` for storage and the resulting memory pressure may adversely affect your performance. `Map` should only be used when you know or can control its size. It is highly encouraged to use something like [`lru-cache'](https://www.npmjs.com/package/lru-cache) which implements an LRU cache.

```js
import { contextCache } from 'feathers-fletching';
import LRU from 'lru-cache';

const makeKey = context => {
  return JSON.stringify({
    method: context.method,
    id: context.id,
    query: context.params.query
  });
};

// Use a custom cacheMap that uses async methods, such as some
// redis client or other persisted store
const cache = contextCache({
  get: (context) => {
    const key = makeKey(context);
    const redisClient = context.app.get('redisClient');
    return redisClient.get(key);
  },
  set: (context) => {
    const key = makeKey(context);
    const result = JSON.parse(JSON.stringify(context.result));
    const redisClient = context.app.get('redisClient');
    return redisClient.set(key, result);
  },
  clear: (context) => {
    const redisClient = context.app.get('redisClient');
    return redisClient.clear();
  }
});

// Use a custom map to write a clear()
// method with a custom eviction policy
const map = new LRU({ max: 100 });
const cache = contextCache({
  get: (context) => {
    const key = makeKey(context);
    return map.get(key);
  },
  set: (context) => {
    const key = makeKey(context);
    const result = JSON.parse(JSON.stringify(context.result));
    return map.set(key, result);
  },
  clear: (context) => {
    const result = context.result;
    const results = Array.isArray(result) ? result : [result];
    results.forEach(result => {
      Array.from(map.keys()).forEach(key => {
        const keyObj = JSON.parse(key);
        if (keyObj.method === 'find') {
          // This is a cached `find` request. Any create/patch/update/del
          // could affect the results of this query so it should be deleted
          return map.del(key);
        } else {
          // This is a cached `get` request
          if (context.method !== 'create') {
            // If not creating, there may be a cached get for this id
            if (keyObj.id === result.id) {
              // keyObj.id.toString() === result.id.toString()
              // keyObj.id.toString() === result._id.toString()
              // Delete all `gets` that have this id
              return map.del(key);
            }
          }
        }
      });
    });
  }
});

service.find(); // No cache hit
service.find(); // Cache hit

service.find({ query: { name: 'Johnny' } }); // No cache hit
service.find({ query: { name: 'Johnny' } }); // Cache hit

service.get(1); // No cache hit
service.get(1); // Cache hit

service.get(1, { query: { name: 'Johnny' } }); // No cache hit
service.get(1, { query: { name: 'Johnny' } }); // Cache hit

// Clears all `find` caches
// Does not clear any `get` caches
service.create();

service.find(); // No cache hit
service.get(1); // Cache hit

// Clears all `find` caches
// Only clears `get` caches with ID 2
service.patch(2, { name: 'Patsy Cline' });

service.find(); // No cache hit
service.get(2); // No cache hit
service.get(1); // Cache hit
```

## rateLimit

Rate limit services using [node-rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible).

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/rateLimit.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| rateLimiter | Object |  | true | A `RateLimiter` instance from `node-rate-limiter-flexible` or any class that implements `consume(key, points)`  as a promise |
| option.makeKey | Function/Promise | `(context) => context.path` | false | A function/promise that returns a key to rate limit against |
| option.makePoints | Function/Promise | `(context) => 1`  | false | A function/promise that returns the number of points to consume for this request |


```js
import { rateLimit } from 'feathers-fletching';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  // 10 requests per second
  points: 10,
  duration: 1
});

const rateLimitHook = rateLimit(rateLimiter);

app.service('api/albums').hooks({
  before: {
    all: [rateLimitHook]
  }
});
```

```js
// Use the `makeKey` option to limit requests by different parameters.

// By default, reqs are limited on the service as a whole
const makeKey = context => context.path;

// Limit reqs by user id
const makeKey = context => context.params.user.id;

// Limit reqs by any combination of context
const makeKey = context => {
  return JSON.stringify({
    user_id: context.params.user.id,
    org_id: context.params.org.id,
  });
};

const rateLimitHook = rateLimit(rateLimiter, { makeKey });
```

```js
// Use the `makePoints` option to dynamically set how many
// points to consume on each request

// By default, each request consumes one point
const makePoints = context => 1;

// Dynamically set points by any combination of context
const makePoints = async context => {
  const { id } = context.params.user;
  const priveleges = await context.service('priveleges').get(id);
  if (priveleges.admin) {
    return 1;
  } else {
    return 2;
  }
};

const rateLimitHook = rateLimit(rateLimiter, { makePoints });
```