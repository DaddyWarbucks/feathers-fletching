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
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/joinQuery.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| options | Object |  | true | An object where each key will be the name of a  query prop the client can use and each value defines the service and ids  |
| option.service | String |  | true | The string name of the service to query against |
| option.targetKey | String |  | true | The name of the key that exists on the collection this service is querying |
| option.foreignKey | String |  | true | The name of the key on the foreign record. Generally this will be `id` or `_id` |


```js
import { joinQuery } from 'feathers-fletching';

/*

  "artists" collection via service `app.service('api/artists')`
  [
    { id: 123, name: 'Johnny Cash' },
    { id: 456, name: 'Patsy Cline' }
  ]

  "albums" collection via `app.service('api/albums')`
  [
    { title: 'The Man in Black', artist_id: 123 },
    { title: 'I Wont Back Down', artist_id: 123 },
    { title: 'Life in Nashville', artist_id: 456 }
  ]
*/

// Hook added to the 'api/albums' service
const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    targetKey: 'artist_id',
    foreignKey: 'id'
  }
});


// Notice how we are querying on the joined `artist` prop
// by passing it `{ name: 'Johnny Cash' }` which will only return
// albums where the artist's name is "Johnny Cash". You can pass
// any query here that you would normally pass to
// app.service('artists', { query: {...} })
const posts = await app.service('api/albums').find({
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
  albums = [
    { title: 'The Man in Black', artist_id: 123 },
    { title: 'I Wont Back Down', artist_id: 123 }
  ]
*/

```

> When using this hook on the client, use the [disablePagination](https://hooks-common.feathersjs.com/hooks.html#disablepagination) hook on the server to ensure proper results. Then be sure to include `$limit: -1` with your join query like `artist: { name: 'Johnny Cash', $limit: -1 }`. Otherwise, the query passed to the join service will not return all joined records and your result set will be incomplete.

## contextCache

Cache the results of `get()` and `find()` requests. Purge the cache on any mutating method.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/contextCache.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| cacheMap | Object |  | true | A Map like object with methods `get`, `set`, and `clear`. Each method is passed `context` as the only argument. Methods can be async.


```js
import { contextCache, LruCacheMap } from 'feathers-fletching';

// Keep the 100 most recently used.
const map = new LruCacheMap({ max: 100 });

const makeKey = context => {
  return JSON.stringify({
    method: context.method,
    id: context.id,
    query: context.params.query
  });
};

const cacheMap = {
  get: (context) => {
    const key = makeKey(context);
    map.get(key);
  },
  set: (context) => {
    const key = makeKey(context);
    const result = JSON.parse(JSON.stringify(context.result));
    return map.set(key, result);
  },
  clear: (context) => {
    return map.clear();
  }
}

const cache = contextCache(cacheMap);

// The contextCache hook should be as "close" to the database as possibe.
// This means it should be the last before hook, and the first after hook.
module.exports = {
  before: {
    all: [],
    find: [beforeHook1, cache],
    get: [beforeHook1, cache],
    create: [beforeHook1, cache],
    update: [beforeHook1, cache],
    patch: [beforeHook1, cache],
    remove: [beforeHook1, cache]
  },
  after: {
    all: [],
    find: [cache, afterHook1],
    get: [cache, afterHook1],
    create: [cache, afterHook1],
    update: [cache, afterHook1],
    patch: [cache, afterHook1],
    remove: [cache, afterHook1]
  }
}

app.service('albums').find(); // No cache hit
app.service('albums').find(); // Cache hit

app.service('albums').create(); // Clears the cache

app.service('albums').find(); // No cache hit
app.service('albums').find(); // Cache hit
```

**Cache Strategy**

Before `get()` and `find()`, if the result exists in the cache it is returned.

After `get()` and `find()`, the results are stored in the cache.

Before `create()`, `update()`, `patch()`, and `remove()` the cache is cleared totally.

**Custom Cache Maps**

The hook may be provided a custom `Map` instance to use as its memoization cache. Any object that implements `get()`, `set()`, and `clear()` methods can be provided and async methods are supported. This means that the cache can even be backed my redis, etc.

The cache will grow without limit when using a standard javascript `Map` and the resulting memory pressure may adversely affect your performance. `Map` should only be used when you know or can control its size. It is highly encouraged to use the `LruCacheMap` from feathers-fletching which implements an LRU cache.

```js
import { contextCache, LruCacheMap  } from 'feathers-fletching';

const makeKey = context => {
  return JSON.stringify({
    method: context.method,
    id: context.id,
    query: context.params.query
  });
};

// Use a custom map that uses async methods, such as some
// redis client or other persisted store
const cacheMap = {
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
};

// Use a custom map to write a clear method with a custom
// eviction policy
const map = new LruCacheMap();

const cacheMap = {
  get: (key, context) => {
    const key = makeKey(context);
    map.get(key);
  },
  set: (key, result, context) => {
    const key = makeKey(context);
    const result = JSON.parse(JSON.stringify(context.result));
    return map.set(key, result);
  },
  clear: (context) => {
    const items = getItems(context);
    const results = Array.isArray(items) ? items : [items];
    results.forEach(result => {
      Object.keys(map).forEach(key => {
        const keyObj = JSON.parse(key);
        if (keyObj.id === result.id) {
          map.delete(key);
        } else {
          const cachedItems = result.data || result;
          const cachedResults = Array.isArray(items) ? items : [items];
          const found = cachedResults.find(cachedRes => {
            cachedRes.id === result.id;
          });
          if (found) {
            map.delete(key);
          }
        }
      });
    });
  }
}

app.service('albums').find(); // No cache hit
app.service('albums').find(); // Cache hit

// Clears the cache of any results that contain ID 1
app.service('albums').patch(1, { name: 'Johnny Cash' });

app.service('albums').find(); // No cache hit if results contained ID 1
app.service('albums').find(); // Cache hit
```