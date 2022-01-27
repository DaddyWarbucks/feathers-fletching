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
    description: 'One of the all time greats!',
    artist_id: 123,
    status: 'platinum',
    summary: 'One...'
    artist: { { name: 'Johnny Cash' } }
  }
*/

// withResult takes a second argument `prepFunc`. This function/promise is run
// before iteration over the virtuals keys and is passed to each
// virtuals function. It is useful for doing operations that will be
// used by multiple virtuals and for setting up batchLoaders.

/*
  context.result = {
    artist_id: 123
  }
*/
const withResults = withResult({
  artist: (result, context, loaders) => {
    return loaders.artists.load(result.artist_id);
  },
  rating: (result, context, loaders) => {
    return loaders.ratings.load(result.rating_id);
  }
},

  async context => {
    // This function is run before iterating over the virtuals object and its
    // result is passed to each virtuals function. This is a great place
    // to setup batchLoaders, which are a very powerful and performant
    // way of joining related documents. For more info on batchLoaders,
    // see the feathers-plus/batch-loader docs
    return {
      artists: new BatchLoader('artists'),
      ratings: new BatchLoader('ratings'),
    }
  }

);

/*
  context.result = {
    artist_id: 123,
    artist: { name: 'Johnny Cash', ... },
    rating: { score: 10, ... }
  }
*/
```

- Virtuals functions are run asyncronously (in parrallel) by default. When using the `@` syntax, all keys that start with `@` will run their virtuals functions syncronously in order of their key definition before running all other keys in parrallel.

- If the result set is an array, then the `result` arg in each virtuals function `(result, context, prepResult) => {}` is the individual item in that array, not the whole array.

- When the result set is an array, the withResult virtuals are applied to each item in the array and this is run asyncrounously via `Promise.all()`.

```js
import { withResult } from 'feathers-fletching';

// All with* and without* hooks share the `@` syntax. If you preface
// a key with an `@` symbol, those keys are collected and run
// synronously in order of their key definition. Then, all other keys
// are run asyncronously

const withResults = withResult({
  '@first': async () => {
    // This promise is guaranteed to run FIRST
    return 'I ran FIRST!';
  },
  '@second': async () => {
    // This promise is guaranteed to run SECOND
    return 'I ran SECOND!';
  },
  third: (result, context, prepResult) => {
    // Runs in parallel [third, fifth], after @first, @second, @fourth
    return 'I ran in parrallel with fifth';
  },
  '@fourth': (result, context, prepResult) => {
    // This promise is guaranteed to run THIRD
    return 'I ran THIRD!';
  },
  fifth: (result, context, prepResult) => {
    // Runs in parallel [third, fifth], after @first, @second, @fourth
    return 'I ran in parallel with third';
  }
});

  /*
  context.result = {
    first: 'I ran FIRST!',
    second: 'I ran SECOND!',
    third: 'I ran in parallel with fifth',
    fourth: 'I ran THIRD',
    fifth: 'I ran in parallel with third'
  }
*/
```

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
| virtuals | Object/Array |  | true | An object where each key will be the name of a property to be potentially filtered from result. **Return a truthy value to keep the value and return a falsey value to remove it**. |
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

```js
// `withoutResult` also accepts an array of strings as the first
// argument as a conveniece syntax. When you use this syntaxt, `prepFunc`
// is ignored.
const withoutResults = withoutResult(['email', 'ssn']);
// this is equivalent to
const withoutResults = withoutResult({ email: false, ssn: false });

// This syntax also supports dot notation of object paths
const withoutResults = withoutResult(['role.role_type']);
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
| virtuals | Object/Array |  | true | An object where each key will be the name of a property to be potentially filtered from data. **Return a truthy value to keep the value and return a falsey value to remove it**. |
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
```js
// `withoutData` also accepts an array of strings as the first
// argument as a conveniece syntax. When you use this syntaxt, `prepFunc`
// is ignored.
const withoutDatas = withoutData(['email', 'ssn']);
// this is equivalent to
const withoutDatas = withoutData({ email: false, ssn: false });

// This syntax also supports dot notation of object paths
const withoutResults = withoutResult(['role.role_type']);
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
| virtuals | Object/Array |  | true | An object where each key will be the name of a property to be potentially filtered from `context.params.query`. **Return a truthy value to keep the value and return a falsey value to remove it**. |
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

```js
// `withoutQuery` also accepts an array of strings as the first
// argument as a conveniece syntax. When you use this syntaxt, `prepFunc`
// is ignored.
const withoutQueries = withoutQuery(['email', 'ssn']);
// this is equivalent to
const withoutQueries = withoutQuery({ email: false, ssn: false });

// This syntax also supports dot notation of object paths
const withoutResults = withoutResult(['role.role_type']);
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
| option.makeKey | Function | `(key) => key.toString()`  | false | A function that parses the `option.targetKey` and `option.foreignKey` |
| option.overwrite | Bool | false | false | Overwrite the query or put sub queries in $and |


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

// You can also use dot.syntax instead of objects. This example
// is the same as the `artist: { name: 'Johnny Cash' }` above
const albums = await app.service('api/albums').find({
  query: {
    'artist.name': 'Johnny Cash'
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
// You can also use nested $and/$or queries
const albums = await app.service('api/albums').find({
  query: {
    $and: [{
      $or: [
        { 'artist.name': 'Johnny Cash' },
        { 'artist.name': 'Johnny Paycheck' },
      ]
    }]
  }
});
```

```js
// Use the `makeKey` option to parse ids. By default,
// the hook tries to call .toString() which is helpful
// for Mongo/Mongoose ids
const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    foreignKey: 'artist_id',
    targetKey: '_id'
    // makeKey: key => key.string(),
    makeKey: key => key
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
// By default, the hook does not clobber the query you provided.
// Instead, it addes the join queries to $and.
// Use the `overwrite` option to overwrite joined properties.
const query = {
  artist_id: 2,
  'artist.name': 'Johnny Cash'
}

// overwrite: false (default)
const joinQuery = {
  artist_id: 2,
  $and: [{
    artist_id: { $in: [1] }
  }]
}

// overwrite: true
const joinQuery = {
  artist_id: { $in: [1] }
}
```

```js
// Sorting for .find() actually happens in the before hook,
// but to sort on other methods (mainly for multi: true) also
// place the hook as an after hook.

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

```js
// This technique of searching across services has
// some known performance limitations. Join queries
// fetch unpaginated ids from their services, and
// this list of ids may be very long.

const idList = await context.app.service('api/artists').find({
  paginate: false,
  query: {
    $select: ['id'],
    name: { $like: 'John' }
  }
});

// idList may be very long...

const ids = idList.map(record => record.id);

const joinQuery = {
  ...query,
  artist_id: { $in: ids }
}

// $in queries can be slow in some DB's

```

> While this service works great when querying across all types of services. It is recommended to use one of the adapter specific hooks like `sequelizeJoinQuery`.

> When using this hook on the client, use the [disablePagination](https://hooks-common.feathersjs.com/hooks.html#disablepagination) hook on the server to ensure proper results. Then be sure to include `$limit: -1` with your join query like `artist: { name: 'Johnny Cash', $limit: -1 }`. Otherwise, the query passed to the join service will not return all joined records and your result set will be incomplete.

## sequelizeJoinQuery

The sequelizeJoinQuery hook leverages Sequelize's [$nested.column.syntax$](https://sequelize.org/master/manual/eager-loading.html#complex-where-clauses-at-the-top-level) and allows you to query across tables without having to manually construct `params.sequelize.include`. The hook scans the `params.query` for any `$nested.column.syntax$` and constructs the `params.sequelize.include` accordingly. The hook supports `$deeply.nested.associations$` and supports all Sequelize query operators.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/sequelizeJoinQuery.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| options | Object |  | true | An object of options. |
| options.makeIncludeOptions | Function |  | false | A function that is called for each association and returns association options |

```js
import { sequelizeJoinQuery } from 'feathers-fletching';

// Given Albums, Artists, and Ratings models
// that have the following associations
Albums.belongsTo(Artists, {
  foreignKey: 'artist_id',
  targetKey: 'id',
  as: 'artist'
});

Ratings.belongsTo(Artists, {
  foreignKey: 'rating_id',
  targetKey: 'id',
  as: 'rating'
});

const sequelizeJoin = sequelizeJoinQuery();

app.service('api/albums').hooks({
  before: {
    all: [sequelizeJoin]
  }
});

// Find albums where the artist's name is Johnny
// Cash and the artist's rating score is 10
const albums = await app.service('api/albums').find({
  query: {
    '$artist.name$': 'Johnny Cash',
    '$artist.rating.score$': 10
  }
});
```

```js
// By default, this hook does not actually append the
// joined records onto the result. In the author's opinion,
// joining documents should be done via the service interface
// with `withResults` (or some other hook). This hook is meant
// to be a query mechanism only, not necessarily a
// joing/populating mechanism.

// You can set the option to append records as well as
// all other sequelize options in the makeIncludeOptions

const sequelizeJoin = sequelizeJoinQuery({
  makeIncludeOptions: (association, context) => {
    /*
      default = {
        attributes: [], // dont append results
        required: true // left inner join
      }
    */

    // Here you can return any standard sequelize options
    // A common option for HasMany relationships is `duplicating`
    const options = {
      required: false, // left outer join
      attributes: ['name'], // append the record's name to result
      nest: true, // append as an obj instead of dot syntax
    };
    if (association.associationType === 'HasMany') {
      options.duplicating = false;
    }
    return options;
  }
});
```

> Note that you will need to whitelist all nested query operators. To learn more about whitelisting operators, see the [feathers-sequelize docs](https://github.com/feathersjs-ecosystem/feathers-sequelize). For the example above, the whitelist would be `['$artist.name$', '$artist.rating.score$']`

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
import { contextCache, ContextCacheMap } from 'feathers-fletching';

// The `ContextCacheMap` uses `lru-cache` under
// the hood and accepts all `lru-cache` options.
const contextCacheMap = new ContextCacheMap({ max: 100 });

const cache = contextCache(contextCacheMap);

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

// Clears all `find` caches because a new record is created.
// This new record could be a result of any find.
// Does not clear any `get` caches because the new record should
// have a unique id which would not affect `gets` to a different id
service.create();

service.find(); // No cache hit
service.get(1); // Cache hit

// Clears all `find` caches because any mutation to a record could
// cause that record to now be a result of some cached find.
// Only clears `get` caches with ID 2 because that is the only `get` affected.
service.patch(2, { name: 'Patsy Cline' });

service.find(); // No cache hit
service.get(2); // No cache hit
service.get(1); // Cache hit because it was not affected
```

**Cache Strategy**

- Before `get()` and `find()` - If the result exists in the cache it is returned.

- After `get()` and `find()` -  The results are stored in the cache.

- After `create()` - All cached `find()` results are cleared. `get()` results are not cleared.

- After `update()` or `patch()` - All cached `find()` results are cleared. Only the cached `get()` results that correspond to the result ids are cleared.

- After `remove()` - All cached `find()` results are cleared. Only the cached `get()` results that correspond to the result ids are cleared.

**Custom Cache Maps**

The hook must be provided a `cacheMap` instance to use as its memoization cache. There is a `ContextCacheMap` exported that handles key serialization, cloning, and eviction policy for you. Any object/class that implements `get(context)`, `set(context)`, and `clear(context)` methods can be provided and async methods are supported. This means that the cache can even be backed by redis, etc. This is also how you can customize key generation, cloning, and eviction policy.

You can simply extend the `ContextCacheMap` by adding your own `map` to it which will keep the key serialization, eviction policy etc but will use a different storage mechanism. Or for more information about how to extend the `ContextCacheMap` class, checkout the [Source Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/lib/contextCacheMap.js)

```js
// Use a custom cacheMap that uses async methods, such as some
// redis client or other persisted store
import { contextCache, ContextCacheMap } from 'feathers-fletching';

const map = {
  get: key => redisClient.get(key),
  set: (key, result) => redisClient.set(key, result),
  delete: key => redisClient.delete(key),
  keys: () => redisClient.keys()
}

const contextCacheMap = new ContextCacheMap({ map });

const cache = contextCache(contextCacheMap);
```

```js
// It is a good practice to setup things like cacheMap, rateLimiters, etc
// on the service options when setting up the service. This ensures you
// can access the cacheMap from anywhere in the app, to clear the cache
// of another service (that may have joined records) for example.

// albums.service.js
const { ContextCacheMap } = require('feathers-fletching');
const { Albums } = require('./albums.class');
const createModel = require('../../models/albums.model');
const hooks = require('./albums.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    cacheMap: new ContextCacheMap({ max: 100 });
  };

  // Initialize our service with any options it requires
  app.use('/albums', new Albums(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('albums');

  service.hooks(hooks);
};

// albums.hooks.js
const { contextCache } = require('feathers-fletching');

// Now you can access the cacheMap from the service options
const cache = context => {
  const { cacheMap } = context.service.options;
  return contextCache(cacheMap)(context);
}
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
const makePoints = context => {
  if (context.params.user.admin) {
    return 0;
  } else {
    return 1;
  }
};

const rateLimitHook = rateLimit(rateLimiter, { makePoints });
```

```js
// It is a good practice to setup things like rateLimiters, cacheMap, etc
// on the service options when setting up the service. This ensures you
// can access the rateLimiter from anywhere in the app.

// albums.service.js
const { RateLimiterMemory } = require('feathers-fletching');
const { Albums } = require('./albums.class');
const createModel = require('../../models/albums.model');
const hooks = require('./albums.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    rateLimiter = new RateLimiterMemory({ points: 10, duration: 1 });
  };

  // Initialize our service with any options it requires
  app.use('/albums', new Albums(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('albums');

  service.hooks(hooks);
};

// albums.hooks.js
const { rateLimit } = require('feathers-fletching');

// Now you can access the rateLimiter from the service options
const cache = context => {
  const { rateLimiter } = context.service.options;
  return rateLimit(rateLimiter)(context);
}
```

## sanitizeError

Replace sensitive items in the `context.error` according to a schema. It is common for database adapters to throw errors from their underlying libraries like Sequelize, Mongoose, Mongo, etc. Because these errors come straight from those ORM's (and often from one of the many different supported database types within the ORM), there is no way to guarantee that these errors do not contain things like database urls or credentials. This can also happen when working with third party APIs or even by leaking information in our own code to errors. This hook improves security by ensuring sensitive data is "masked" within errors.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| no | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/sanitizeError.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| schema | Object/Function |  | true | A schema where each key is the sensitive string to replace and the value is either a string to replace it with or a function that returns a string to replace it with |


```js
import { sanitizeError } from 'feathers-fletching';

// Replace the string with a default value. This hook will
// recursively traverse every key in the error and will
// replace any occurence of "my.database.com:3030" with "*****"
const sanitized = sanitizeError({
  'my.database.com:3030': '*****'
});

// Use a function to sanitize the key. This example
// demonstrates making the *'s the same length as the string
// it is masking. You could also use RegEx to do any kind
// of searching and replacing in the string.
const sanitized = sanitizeError({
  'my.database.com:3030': (string, key) => {
    let mask = '';
    for (i = 0; i < string.length; i++) {
      mask = mask + '*';
    }
    return string.replace(key, mask)
  }
});

app.service('api/albums').hooks({
  after: {
    all: [sanitized]
  }
});

// This throws some error from the database like
// new Error("getaddrinfo ENOTFOUND my.database.com:3030");
app.service('api/albums').find()

/*
  context.error = {
    message: "getaddrinfo ENOTFOUND *****"
  }
*/
```

```js
// Use a function to create the schema. This example uses the feathers
// configuration to replace sensitive data with their variable names instead.
// You should create this hook and apply ALL of your sensitive data like api
// keys, database urls, auth secrets, etc. Then use it as an app after
// hook. This will protect all of your services in one place.
const sanitized = sanitizeError(context => {
  const apiKey = context.app.get('API_KEY');
  const databaseUrl = context.app.get('DATABASE_URL');
  const stripe_key = context.app.get('STRIPE_KEY');
  const secret = context.app.get('authentication').secret;
  return {
    [apiKey]: 'API_KEY',
    [databaseUrl]: 'DATABASE_URL',
    [stripe_key]: 'STRIPE_KEY'
    [secret]: 'AUTH_SECRET',
  }
});

/*
  context.error = {
    message: "getaddrinfo ENOTFOUND DATABASE_URL
  }
*/
```

## sanitizeResult

Replace sensitive items in the `context.result` according to a schema. This hook improves security by ensuring sensitive data is "masked" before leaving the server. Unlike [withoutResult](#withoutResult) that removes properties totally (and you have to know those property names), this hook is a catch-all that ensures any property on any result does not contain sensitive data.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | yes | all | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/sanitizeResult.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| schema | Object/Function |  | true | A schema where each key is the sensitive string to replace and the value is either a string to replace it with or a function that returns a string to replace it with |


```js
import { sanitizeResult } from 'feathers-fletching';

// Replace the string with a default value. This hook will
// recursively traverse every object in the result and will
// replace any occurence of "Ab123cD" with "*****"
const sanitized = sanitizeResult({
  'Ab123cD': '*****'
});

// Use a function to sanitize the key. This example
// demonstrates making the *'s the same length as the string
// it is masking. You could also use RegEx to do any kind
// of searching and replacing in the string.
const sanitized = sanitizeResult({
  'Ab123cD': (string, key) => {
    let mask = '';
    for (i = 0; i < string.length; i++) {
      mask = mask + '*';
    }
    return string.replace(key, mask)
  }
});

app.service('api/albums').hooks({
  after: {
    all: [sanitized]
  }
});

app.service('api/albums').find()

/*
  context.result = {
    title: "Johnny's api key is *****"
  }
*/
```

```js
// Use a function to create the schema. This example uses the feathers
// configuration to replace sensitive data with their variable names instead.
// You should create this hook and apply ALL of your sensitive data like api
// keys, database urls, auth secrets, etc. Then use it as an app after
// hook. This will protect all of your services in one place.
const sanitized = sanitizeResult(context => {
  const apiKey = context.app.get('API_KEY');
  const databaseUrl = context.app.get('DATABASE_URL');
  const stripe_key = context.app.get('STRIPE_KEY');
  const secret = context.app.get('authentication').secret;
  return {
    [apiKey]: 'API_KEY',
    [databaseUrl]: 'DATABASE_URL',
    [stripe_key]: 'STRIPE_KEY'
    [secret]: 'AUTH_SECRET',
  }
});
```

```js
// I don't get it...how is this helpful? There isn't any "sensitive" data
// in my database because I use good validation, etc.

// Let's use an example where we accidently leak some sensitive data into
// the result, not because it is data on the actual result, but because
// we made a mistake in our code and leaked an environment variable.
const attachStripeResult = async context => {
  const stripe_id = context.result.stripe_id;
  const stripe_key = context.app.get('stripeKey');
  const stripe_client = context.app.get('stripeClient');
  const result = await stripeClient.find(stripe_id, stripe_key);
  context.result.stripe = {
    stripe_key,
    result
  }
  return context
}

// Did you catch the error? We meant to return the user's stripe result
// along with the stripe_id...but we accidently returned our own secret
// stripe key. Uh Oh! By using the sanitizeResult hook, we safeguard
// ourselves against this type of mistake.
```

## stashable

Stash the result of an update, patch, or remove before mutating it.

Stashing a document in a hook so that it can be compared is a common practice. This is accomplished easily enough and hardly worth a custom hook. But, when working with multiple hooks that may or may not need that stashed record, it becomes difficult keep track of if the document has already been stashed or not. The `stashable` hook stashes a memoized version of the promise, rather than the result. This allows you to call `const stashed = await context.params.stashed()` multiple times but only actually call the underlying stash function once.

**Context**

| Before | After | Methods | Multi | Source |
| :-: | :-: | :-:  | :-: | :-: |
| yes | no | update, patch, remove | yes | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/stashable.js) |

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| option.propName | String | `stashed` | false | The name of the property on context.params to place the stashed function |
| option.stashFunc | Function/Promise | [See source](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/stashable.js)  | false | A function/promise that returns the document/documents to be stashed |


```js
import { stashable } from 'feathers-fletching';

const stashed = stashable();

app.service('api/albums').hooks({
  before: {
    update: [stashed, hook1, hook2],
    patch: [stashed, hook1, hook2],
    remove: [stashed, hook1, hook2],
  }
});

const hook1 = async context => {
  // Calls the stash function for the first time
  const stashed = await context.params.stashed();
}

const hook2 = async context => {
  // Returns a memoized promise (does not call DB again)
  const stashed = await context.params.stashed();
}
```


```js
// Example of how this would traditionally be accomplished

const stash = async context => {
  // Assign the document to params so that it can be referenced later
  context.params.stashed = await context.service.get(context.id);
  return context;
}

const hook1 = context => {
  if (context.params.someCondition) {
    const stashed = context.params.stashed;
    // Do something with stashed record
  }
  return context;
}

const hook2 = context => {
  if (context.params.someOtherCondition) {
    const stashed = context.params.stashed;
    // Use the stashed record to do somehting else
  }
  return context;
}

// So what's wrong with this? It seems like it would work well enough.
// And it does! But what happens when neither `someCondition` or
// `someOtherCondition` are met? We have wasted a call to the
// stash function because that stashed record was never used. We
// can make this better...

const hook1 = async context => {
  if (context.params.someCondition) {
    // Move the call to the DB here in the first hook where
    // we first need it
    context.params.stashed = await context.service.get(context.id);
    // Do something with stashed record
  }
  return context;
}

const hook2 = async context => {
  if (context.params.someOtherCondition) {

    // Geww...this is gross. The record may or may not be stashed
    // yet so we have to check and stash it if not.
    if (!context.params.stashed) {
      context.params.stashed = await context.service.get(context.id);
    }

    // Use the stashed record to do somehting else
  }
  return context;
}

// This is better for performance because we only stash the record when/if
// we need it. But, the code is bulky and specific. With a long chain of
// hooks this becomes cumbersome and unweildy.


// Example with the same hooks using the stashable hook. This hook allows
// you to call the stash function as many times as you would like in as
// many hooks as you need, but it only ever actually calls the DB on
// the first invocation of the function. This allows you to create
// much cleaner and more readable code where you call the stash
// function wherever you need it, without the performance penalty
// of calling the DB multiple times

const hook1 = context => {
  if (context.params.someCondition) {
    // This calls the DB for the first time
    const stashed = await context.params.stashed();
    // Do something with stashed record
  }
  return context;
}

const hook2 = context => {
  if (context.params.someOtherCondition) {
    // No need to check if the stash function has been called before.
    // If it has already been called via hook1 then the DB is not
    // called again. If it has not already been called, then the DB
    // is called for the first time
    const stashed = await context.params.stashed();
    // Use the stashed record to do somehting else
  }
  return context;
}

```

```js
// Use the `propName` option to assign the function to a different property.
const stashed = stashable({ propName: 'myProp' });

const hook1 = context => {
  const stashed = await context.params.myProp();
}
```

```js
// Use the `stashFunc` to use a different stash function or params.

// Default stashFunc. This function uses the same params as the parent.
// It also handles multi:true via the `context.id === null` block
const stashFunc = context => {
  if (context.id === null) {
    const findParams = Object.assign({}, context.params, { paginate: false });
    return context.service.find(findParams);
  }

  return context.service.get(context.id, context.params);
};

// You can also pass in your own function/params to handle the
// stashing of the document how you see fit
const myStashFunc = context => {};

const stashed = stashable({ stashFunc: myStashFunc });
```

## serviceLoader

**Please note that LazyLoader, ServiceLoader, and these docs are a WIP. They are not currently published to NPM and the docs are only published as an easy way for beta testers to see what they are all about. If you like this feature or have some feedback, open an issue describing what you like or don't like. And hopefully this will be released soon!**

This section is not a hook per-se, but is an example of how to use the `ServiceLoader` and `LazyLoader` classes to boost performance. The `ServiceLoader` class is an abstraction around `feathers-batchloader` which is heavily inspired by [GraphQL DataLoader](https://github.com/graphql/dataloader) with some additional features. For more info about how DataLoader works, checkout this awesome video of the [DataLoader Walkthrough](https://www.youtube.com/watch?v=OQTnXNCDywA)

**Context**

| Before | After | Methods | Multi |                                                Source                                                 |
| :----: | :---: | :-----: | :---: | :---------------------------------------------------------------------------------------------------: |
|  yes   |  yes  |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/lib/serviceLoader.js) |

All of the examples below assume the following services and collections. These collections are meant to represent the most common relationship types.

```js
albums = [
  {
    id: 'album_123'
    title: 'Man in Black',
    artist_id: 'artist_123', // note same id
    categorey_ids: ['category_123', 'category_456']
  },
  {
    id: 'album_456'
    title: 'I walk the line',
    artist_id: 'artist_123', // note same id
    categorey_ids: ['category_456']
  },
  {
    id: 'album_789'
    title: 'Always',
    artist_id: 'artist_456',
    categorey_ids: ['category_123']
  },
];

artists = [
  {
    id: 'artist_123',
    name: 'Johnny Cash',
  },
  {
    id: 'artist_456',
    title: 'Patsy Cline',
  }
];

categories = [
  {
    id: 'category_123',
    name: 'country'
  },
  {
    id: 'category_456',
    name: "rock"
  }
];

reviews = [
  {
    id: 'review_123',
    album_id: 'album_123', // note same id
    text: 'Its the best!'
  },
  {
    id: 'review_456',
    album_id: 'album_123', // note same id
    text: 'All time greatest!'
  },
  {
    id: 'review_789',
    album_id: 'album_456',
    text: 'Its great!'
  }
];
```

```js
// We can setup a ServiceLoader for each service and attach it to
// context or context.params.
const setupLoaders = (context) => {
  context.artistsLoader = new ServiceLoader(context.app.service('artists'));
  context.categoriesLoader = new ServiceLoader(context.app.service('categories'));
  context.reviewsLoader = new ServiceLoader(context.app.service('reviews'));

  return context;
};

// Even better, use the LazyLoader. By using the LazyLoader, you
// do not have to know what services will be used and therefore
// don't have to manually setup each loader. Instead, a new
// ServiceLoader is lazily created and cached when called.
const setupLoaders = (context) => {
  context.lazyLoader = new LazyLoader(context);
  context.loader = context.lazyLoader.loader;

  return context;
};
```

The first two methods to explore are the `get()` and `load()` methods. The `get()` method is a direct replacement to the `service.get()` method, except that it caches the results of the id/params. The `load()` method uses a `batchLoader` under the hood to collate multiple service calls into one.

**The `load()` method returns 1 record per id, similar to get()**

```js
// This example uses the standard service.get() method
// and would result in 3 service calls. This is the most
// basic way to join a record in Feathers.
const withResults = withResult({
  artist: (album, context) => {
    return context.app.service('artists').get(album.artist_id);
  }
});

// 3 service calls
app.service('artists').get('artist_123');
app.service('artists').get('artist_123');
app.service('artists').get('artist_456');
```

```js
// This example uses the context.loader('artists').get() method.
// Using the get() method from the loader results in 2 service
// calls. This is because the loader's get() method caches
// results, and because we have two albums with the same artist_id,
// the result for that artist_id is cached.
const withResults = withResult({
  artist: (album, context) => {
    return context.loader('artists').get(album.artist_id);
  }
});

// 2 service calls
app.service('artists').get('artist_123');
// app.service("api/artists").get("artist_123"); // cache hit
app.service('artists').get('artist_456');
```

```js
// This example uses the context.loader('artists').load() method.
// Using the load() method from the loader results in 1 service
// call. This is because the loader's load() method caches
// & batches results via a batchLoader.
const withResults = withResult({
  artist: (album, context) => {
    return context.loader('artists').load(album.artist_id);
  }
});

// 1 service call. Nice! Thats what we want!
app.service('artists').find({
  query: {
    id: { $in: ['artist_123', 'artist_456'] },
  }
});
```

```js
// So when would you use load() vs get()? Generally, you can prefer
// load(). But, its important to keep in mind that when using load(),
// if an id is not found it will return `null` instead of throwing an
// error. This is done because load() is "batching" all of its ids
// into one service call, so even if some ids fail others will be
// returned. Use get() when you want a more traditional flow
const withResults = withResult({
  artist: (album, context) => {
    // This will throw an error just like a service.get()
    return context.loader('artists').get('some_bogus_id');
  },
  artist: (album, context) => {
    // This will return null
    return context.loader('artists').load('some_bogus_id');
  }
});

// 1 service call. Nice! Thats what we want!
app.service('artists').find({
  query: {
    id: { $in: ['artist_123', 'artist_456'] },
  }
});
```

```js
// You can also use an object as the id. This is helpful
// when the relationship is not on the service's primary id
const withResults = withResult({
  artist: (album, context) => {
    return context.loader('artists').load({ id: album.artist_id });
    // same as below because the default primary key on artists is "id"
    // return context.loader('artists').load(album.artist_id);
  },
  artist2: (album, context) => {
    return context.loader('artists').load(
      { some_other_id: album.some_other_artist_id }
    );
  }
});
```

```js
// The load() method can also accept an array of ids. The result
// will be an array of records matching those ids.
const withResults = withResult({
  categories: (album, context) => {
    return context.loader('categories').load(album.categorey_ids);
  }
});
```

Next we will look at the `find()` and `loadMany()` methods. The `find()`  method is a direct replacement to the `service.find()` method, except that it caches the results of the params. The `loadMany()` method uses a `batchLoader` under the hood to collate multiple service calls into one.

**The `loadMany()` method returns many records per id, similar to how a find() returns many records**

```js
// This example uses the standard service.find() method
// and would result in 3 service calls.
const withResults = withResult({
  reviews: (album, context) => {
    return context.app.service('reviews').find({
      query: { album_id: album.id }
    });
  }
});

// 3 service calls
app.service('reviews').find({
  query: { album_id: 'album_123' }
});
app.service('reviews').find({
  query: { album_id: 'album_456' }
});
app.service('reviews').find({
  query: { album_id: 'album_789' }
});
```

```js
// This example uses the context.loader('reviews').find() method
// and would also result in 3 service calls. Bummer, why does this
// also result in 3 service calls. This is because each query
// is unique, so caching cannot be done effectively.
const withResults = withResult({
  reviews: (album, context) => {
    return context.loader('reviews').find({
      query: { album_id: album.id }
    });
  }
});

// 3 service calls
app.service('reviews').find({
  query: { album_id: 'album_123' }
});
app.service('reviews').find({
  query: { album_id: 'album_456' }
});
app.service('reviews').find({
  query: { album_id: 'album_789' }
});
```

```js
// This example uses the context.loader('reviews').loadMany() method.
// Using the loadMany() method from the loader results in 1 service
// call. This is because the loader's loadMany() method caches
// & batches results via a batchLoader.
const withResults = withResult({
  reviews: (album, context) => {
    return context.loader('reviews').loadMany({
      query: { album_id: album.id }
    });
  }
});

// 1 service call. Nice! Thats what we want!
app.service('reviews').find({
  query: {
    album_id: { $in: ['album_123', 'album_456', 'album_789'] },
  }
});
```

```js
// When would you want to use find() vs loadMany(). If there is
// some kind of localKey/foreignKey relationship, use loadMany().
// If you are using no query or an arbitrary query, use find()
// and it will cache equivalent queries.
const withResults = withResult({
  reviews: (album, context) => {
    // There is a known localKey/foreignKey relationship and will
    // result in 1 service call to fetch all reviews
    return context.loader('reviews').loadMany({
      query: { album_id: album.id }
    });
  },
  // TODO: Static find query and variable query that has some dupes
});
```