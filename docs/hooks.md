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

## withResult

Add or overwrite properties onto the `context.result` or `context.result.data`. Useful for joining/populating records and creating resolver properties.

**Context**

| Before | After | Methods | Multi |                                                Source                                                |
| :----: | :---: | :-----: | :---: | :--------------------------------------------------------------------------------------------------: |
|   no   |  yes  |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withResult.ts) |

**Arguments**

| Argument  |       Type       | Default  | Required | Description                                                                                                                                             |
| :-------: | :--------------: | :------: | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| resolvers |      Object      |          |   true   | An object where each key will be the name of a property to be added to the `context.result` and each value is either a primitive, function, or promise. |
| prepFunc  | Function/Promise | () => {} |  false   | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the resolvers object.  |

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
// before iteration over the resolvers keys and is passed to each
// resolvers function. It is useful for doing operations that will be
// used by multiple resolvers and for setting up batchLoaders.

/*
  context.result = {
    artist_id: 123
  }
*/
const withResults = withResult(
  {
    artist: (result, context, loaders) => {
      return loaders.artists.load(result.artist_id);
    },
    rating: (result, context, loaders) => {
      return loaders.ratings.load(result.rating_id);
    }
  },

  async (context) => {
    // This function is run before iterating over the resolvers object and its
    // result is passed to each resolver function. This is a great place
    // to setup batchLoaders, which are a very powerful and performant
    // way of joining related documents. For more info on batchLoaders,
    // see the feathers-plus/batch-loader docs
    return {
      artists: new BatchLoader('artists'),
      ratings: new BatchLoader('ratings')
    };
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

- Resolver functions are run asynchronously (in parallel) by default. When using the `@` syntax, all keys that start with `@` will run their resolvers functions synchronously in order of their key definition before running all other keys in parallel.

- If the result set is an array, then the `result` arg in each resolvers function `(result, context, prepResult) => {}` is the individual item in that array, not the whole array.

- When the result set is an array, the withResult resolvers are applied to each item in the array and this is run asynchronously via `Promise.all()`.

```js
import { withResult } from 'feathers-fletching';

// All with* and without* hooks share the `@` syntax. If you preface
// a key with an `@` symbol, those keys are collected and run
// synchronous in order of their key definition. Then, all other keys
// are run asynchronously

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

## withData

Add or overwrite properties to the `context.data` of a method call. Useful for adding default data, creating joined data, and adding server side rules to data.

**Context**

| Before | After | Methods | Multi |                                               Source                                               |
| :----: | :---: | :-----: | :---: | :------------------------------------------------------------------------------------------------: |
|  yes   |  no   |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withData.ts) |

**Arguments**

| Argument  |       Type       | Default  | Required | Description                                                                                                                                            |
| :-------: | :--------------: | :------: | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| resolvers |      Object      |          |   true   | An object where each key will be the name of a property to be added to the `context.data` and each value is either a primitive, function, or promise.  |
| prepFunc  | Function/Promise | () => {} |  false   | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the resolvers object. |

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
    if (data.categories) {
      const promises = data.categories.map((newCat) => {
        return context.app.service('categories').create(newCat);
      });

      const newCategories = await Promise.all(promises);
      const newCategoryIds = newCategories.map((newCat) => newCat.id);

      delete data.categories;

      return [...data.category_ids, ...newCategoryIds];
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

## withQuery

Add or overwrite properties to the `context.params.query` of a method call. This hook is useful for creating "ACL" rules by enforicing some queries are only added via the server.

This hook is also useful for offering the client a simple query interface that you can then use to create more complicated queries.

**Context**

| Before | After | Methods | Multi |                                               Source                                                |
| :----: | :---: | :-----: | :---: | :-------------------------------------------------------------------------------------------------: |
|  yes   |  no   |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/withQuery.ts) |

**Arguments**

| Argument  |       Type       | Default  | Required | Description                                                                                                                                                   |
| :-------: | :--------------: | :------: | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| resolvers |      Object      |          |   true   | An object where each key will be the name of a property to be added to the `context.params.query` and each value is either a primitive, function, or promise. |
| prepFunc  | Function/Promise | () => {} |  false   | A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the resolvers object.        |

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
      return { $gte: startOf($period), $lte: endOf($period) };
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

## joinQuery

Query across services for "joined" records on any database type. This hook relies on the service interface, rather than the database, to query across services allowing you to query similar to a relational database even on services that are NoSQL or even those that do not have a database at all.

**Context**

| Before | After | Methods | Multi |                                               Source                                                |
| :----: | :---: | :-----: | :---: | :-------------------------------------------------------------------------------------------------: |
|  yes   |  yes  |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/joinQuery.ts) |

**Arguments**

|     Argument      |       Type       |                       Default                       | Required | Description                                                                                                                                     |
| :---------------: | :--------------: | :-------------------------------------------------: | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
|      options      |      Object      |                                                     |   true   | An object where each key will be the name of a query prop that the client can use and each value defines the service and ids                    |
|  option.service   |      String      |                                                     |   true   | The string name of the service to query against                                                                                                 |
| option.targetKey  |      String      |                                                     |   true   | The name of the key that exists on the collection this service is querying                                                                      |
| option.foreignKey |      String      |                                                     |   true   | The name of the key on the foreign record. Generally this will be `id` or `_id`                                                                 |
| option.makeParams | Function/Promise | `(defaultParams, context, option) => defaultParams` |  false   | A function/promise that returns params to be sent to the `option.service` find method.                                                          |
|  option.makeKey   |     Function     |                   `(key) => key`                    |  false   | A function that parses the `option.targetKey` and `option.foreignKey`. When using Mongo/Mongoose you will likely need to parse keys to strings. |
| option.overwrite  |       Bool       |                        false                        |  false   | Overwrite the query or put sub queries in $and                                                                                                  |

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
    $and: [
      {
        $or: [
          { 'artist.name': 'Johnny Cash' },
          { 'artist.name': 'Johnny Paycheck' }
        ]
      }
    ]
  }
});
```

```js
// Use the `makeKey` option to parse ids. When using Mongo
// or Mongoose, you will likely need to parse ObjectId's
// to strings.
const joinQueries = joinQuery({
  artist: {
    service: 'api/artists',
    foreignKey: 'artist_id',
    targetKey: '_id'
    makeKey: key => key.string()
  }
});
```

```js
// Use the `makeParams` option to pass additional params to the
// underlying `option.service.find()`. Be sure to merge the
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
// Instead, it adds the join queries to $and.
// Use the `overwrite` option to overwrite joined properties.
const query = {
  artist_id: 2,
  'artist.name': 'Johnny Cash'
};

// overwrite: false (default)
const joinQuery = {
  artist_id: 2,
  $and: [
    {
      artist_id: { $in: [1] }
    }
  ]
};

// overwrite: true
const joinQuery = {
  artist_id: { $in: [1] }
};
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
    'artist.name': { $like: 'John' },
    $sort: { 'artist.name': -1 }
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

> This technique of searching across services has some known performance limitations. Joined queries fetch a list of unpaginated IDs from their services, and this list of ids may be very long. These IDs are then used within an `$in` query for the main service, which is generally not a performant query operator. When sorting with a join query, the main service also disables pagination. This means all results are returned from the database and sorted in memory. While this hook works great when querying across multiple types of feathers database adapters, most applications use one type of database adapter. It is recommended to use one of the database adapter specific hooks like `sequelizeJoinQuery` or `mongoJoinQuery` for those types of services. These database specific hooks are able to handle the filtering and sorting at the database level and are much more performant.

> When using this hook on the client, use the [disablePagination](https://hooks-common.feathersjs.com/hooks.html#disablepagination) hook on the server to ensure proper results. Then be sure to include `$limit: -1` with your join query like `artist: { name: 'Johnny Cash', $limit: -1 }`. Otherwise, the query passed to the join service will not return all joined records and your result set will be incomplete.

## mongoJoinQuery

Use the [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/) to join documents across services. This hook is similar to the `joinQuery` hook, but it is specifically designed for MongoDB services. This hook is more performant than the `joinQuery` hook because it uses the MongoDB Aggregation Pipeline to join documents at the database level. This hook requires that you are on the latest versions of `@feathers/mongodb` that support `params.pipeline`.

The hook constructs a `params.pipeline` that uses the aggregation framework's `$lookup` stage to join documents across services. The `$lookup` stage populates the data with an **array of results**. You can then query the array of joined documents just like you would when query a regular array of embedded documents.

**Context**

| Before | After | Methods | Multi |                                                  Source                                                  |
| :----: | :---: | :-----: | :---: | :------------------------------------------------------------------------------------------------------: |
|  yes   |  no   |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/mongoJoinQuery.ts) |

**Arguments**

|      Argument       |       Type       |                       Default                       | Required | Description                                                                                                                  |
| :-----------------: | :--------------: | :-------------------------------------------------: | :------: | ---------------------------------------------------------------------------------------------------------------------------- |
|       options       |      Object      |                                                     |   true   | An object where each key will be the name of a query prop that the client can use and each value defines the service and ids |
|   option.service    |      String      |                                                     |   true   | The string name of the service to query against                                                                              |
|  option.localField  |      String      |                                                     |   true   | The name of the key that exists on the collection this service is querying                                                   |
| option.foreignField |      String      |                                                     |   true   | The name of the key on the foreign record. Generally this will be `id` or `_id`                                              |
|  option.makeParams  | Function/Promise | `(defaultParams, context, option) => defaultParams` |  false   | A function/promise that returns params to be sent to the `option.service` find method.                                       |

```js
import { mongoJoinQuery } from 'feathers-fletching';

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

const joinQueries = mongoJoinQuery({
  artist: {
    service: 'api/artists',
    localField: 'artist_id',
    foreignField: 'id'
  }
});

app.service('api/albums').hooks({
  before: {
    all: [joinQueries]
  }
});


const albums = await app.service('api/albums').find({
  query: {
    'artist.name': 'Johnny Cash'
  }
});

// You hook supports complex, nested queries
const albums = await app.service('api/albums').find({
  query: {
    'artist.profile.categories': { $in: ['Country', 'Western'] }
    'label.city': 'Nashville',
    $and: [
      {
        $or: [
          { 'artist.name': 'Johnny Cash' },
          { 'artist.name': 'Johnny Paycheck' }
        ]
      }
    ],
    $sort: { 'artist.name': -1 }
  }
});
```

To query documents nested multiple levels deep, each corresponding service must have `options.associations`. This hook does not actually call the `find` method on the associated services. But, it does need to look at the service's `options.associations` to know how to construct the `$lookup` stage.

> Take caution when using this hook with your own hooks (or others) that also modify the `params.pipeline`. Be sure to understand how the feathers mongo adapter uses the `params.pipeline` and `$feathers` stage. See [more info](https://feathersjs.com/api/databases/mongodb.html#the-feathers-stage).

This hook works by adding a `$lookup` stage for every association, adding the `$feathers` stage so it can query those associations, and then adding a `$project` that remove any associations. The associations are removed to prevent leaking data. For example, if someone queried by `user.name` Mongo joins the whole user onto the record so that you can query it. But, you don't want to leak the user's email or password, so the `$project` stage removes all associations. Similar to other hooks in this library, the `mongoJoinQuery` hook is meant to be a query mechanism only, not necessarily a joining/populating mechanism. When adding your own stages to the pipeline, be sure to keep this in mind. You may have added your own `$lookup` stage to join `artist`, and then also queried by `artist.name`, which would remove the `artist` you purposefully joined. You should use `withResult` or Feathers resolvers to join documents onto the result. Keep in mind that you can use the service's ``

## sequelizeJoinQuery

The sequelizeJoinQuery hook leverages Sequelize's [$nested.column.syntax$](https://sequelize.org/master/manual/eager-loading.html#complex-where-clauses-at-the-top-level) and allows you to query across tables without having to manually construct `params.sequelize.include`. The hook scans the `params.query` for any `$nested.column.syntax$` and constructs the `params.sequelize.include` accordingly. The hook supports `$deeply.nested.associations$` and supports all Sequelize query operators.

**Context**

| Before | After | Methods | Multi |                                                    Source                                                    |
| :----: | :---: | :-----: | :---: | :----------------------------------------------------------------------------------------------------------: |
|  yes   |  no   |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/sequelizeJoinQuery.ts) |

**Arguments**

|          Argument          |   Type   | Default | Required | Description                                                                    |
| :------------------------: | :------: | :-----: | :------: | ------------------------------------------------------------------------------ |
|          options           |  Object  |         |   true   | An object of options.                                                          |
| options.makeIncludeOptions | Function |         |  false   | A function that is called for each association and returns association options |

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

By default, this hook does not actually append the joined records onto the result. In the author's opinion, joining documents should be done via the interface `withResults` (or some other hook). This hook is meant to be a query mechanism only, not necessarily a joining/populating mechanism.

```js
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
      nest: true // append as an obj instead of dot syntax
    };
    if (association.associationType === 'HasMany') {
      options.duplicating = false;
    }
    return options;
  }
});
```

> Note that you will need to whitelist all nested query operators. To learn more about whitelisting operators, see the [feathers docs](https://feathersjs.com/guides/migrating#custom-filters-operators). For the example above, the filter would be `{ '$artist.name$': true, '$artist.rating.score$': true }`

## contextCache

Cache the results of `get()` and `find()` requests. Clear the cache on any other method.

**Context**

| Before | After | Methods | Multi |                                                 Source                                                 |
| :----: | :---: | :-----: | :---: | :----------------------------------------------------------------------------------------------------: |
|  yes   |  yes  |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/contextCache.ts) |

**Arguments**

|    Argument    |       Type       | Default | Required | Description                                                                                         |
| :------------: | :--------------: | :-----: | :------: | --------------------------------------------------------------------------------------------------- |
|    cacheMap    |      Object      |         |   true   | A Map like object where each method is passed `context` as the only argument. Methods can be async. |
|  cacheMap.get  | Function/Promise |         |   true   | Called before `get` and `find`                                                                      |
|  cacheMap.set  | Function/Promise |         |   true   | Called after `get` and `find`                                                                       |
| cacheMap.clear | Function/Promise |         |   true   | Called after `create`, `update`, `patch` and `remove`                                               |

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

- After `get()` and `find()` - The results are stored in the cache.

- After `create()` - All cached `find()` results are cleared. `get()` results are not cleared.

- After `update()` or `patch()` - All cached `find()` results are cleared. Only the cached `get()` results that correspond to the result ids are cleared.

- After `remove()` - All cached `find()` results are cleared. Only the cached `get()` results that correspond to the result ids are cleared.

**Custom Cache Maps**

The hook must be provided a `cacheMap` instance to use as its memoization cache. There is a `ContextCacheMap` exported that handles key serialization, cloning, and eviction policy for you. Any object/class that implements `get(context)`, `set(context)`, and `clear(context)` methods can be provided and async methods are supported. This means that the cache can even be backed by redis, etc. This is also how you can customize key generation, cloning, and eviction policy.

You can simply extend the `ContextCacheMap` by adding your own `map` to it which will keep the key serialization, eviction policy etc but will use a different storage mechanism. Or for more information about how to extend the `ContextCacheMap` class, checkout the [Source Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/lib/contextCacheMap.ts)

```js
// Use a custom cacheMap that uses async methods, such as some
// redis client or other persisted store
import { contextCache, ContextCacheMap } from 'feathers-fletching';

const map = {
  get: (key) => redisClient.get(key),
  set: (key, result) => redisClient.set(key, result),
  delete: (key) => redisClient.delete(key),
  keys: () => redisClient.keys()
};

const contextCacheMap = new ContextCacheMap({ map });

const cache = contextCache(contextCacheMap);
```

```js
// It is a good practice to setup things like cacheMap, rateLimiters, etc
// on the service options when setting up the service. This ensures you
// can access the cacheMap from anywhere in the app, to clear the cache
// of another service (that may have joined records) for example.

// albums.service.ts
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

// albums.hooks.ts
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

| Before | After | Methods | Multi |                                               Source                                                |
| :----: | :---: | :-----: | :---: | :-------------------------------------------------------------------------------------------------: |
|  yes   |  no   |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/rateLimit.ts) |

**Arguments**

|     Argument      |       Type       |           Default           | Required | Description                                                                                                                 |
| :---------------: | :--------------: | :-------------------------: | :------: | --------------------------------------------------------------------------------------------------------------------------- |
|    rateLimiter    |      Object      |                             |   true   | A `RateLimiter` instance from `node-rate-limiter-flexible` or any class that implements `consume(key, points)` as a promise |
|  option.makeKey   | Function/Promise | `(context) => context.path` |  false   | A function/promise that returns a key to rate limit against                                                                 |
| option.makePoints | Function/Promise |      `(context) => 1`       |  false   | A function/promise that returns the number of points to consume for this request                                            |

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
const makeKey = (context) => context.path;

// Limit reqs by user id
const makeKey = (context) => context.params.user.id;

// Limit reqs by any combination of context
const makeKey = (context) => {
  return JSON.stringify({
    user_id: context.params.user.id,
    org_id: context.params.org.id
  });
};

const rateLimitHook = rateLimit(rateLimiter, { makeKey });
```

```js
// Use the `makePoints` option to dynamically set how many
// points to consume on each request

// By default, each request consumes one point
const makePoints = (context) => 1;

// Dynamically set points by any combination of context
const makePoints = (context) => {
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

// albums.service.ts
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

// albums.hooks.ts
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

| Before | After | Methods | Multi |                                                 Source                                                  |
| :----: | :---: | :-----: | :---: | :-----------------------------------------------------------------------------------------------------: |
|   no   |  yes  |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/sanitizeErrot.ts) |

**Arguments**

| Argument |      Type       | Default | Required | Description                                                                                                                                                           |
| :------: | :-------------: | :-----: | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  schema  | Object/Function |         |   true   | A schema where each key is the sensitive string to replace and the value is either a string to replace it with or a function that returns a string to replace it with |

```js
import { sanitizeError } from 'feathers-fletching';

// Replace the string with a default value. This hook will
// recursively traverse every key in the error and will
// replace any occurrence of "my.database.com:3030" with "*****"
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
    return string.replace(key, mask);
  }
});

app.service('api/albums').hooks({
  after: {
    all: [sanitized]
  }
});

// This throws some error from the database like
// new Error("getaddrinfo ENOTFOUND my.database.com:3030");
app.service('api/albums').find();

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

Replace sensitive items in the `context.result` according to a schema. This hook improves security by ensuring sensitive data is "masked" before leaving the server.

**Context**

| Before | After | Methods | Multi |                                                  Source                                                  |
| :----: | :---: | :-----: | :---: | :------------------------------------------------------------------------------------------------------: |
|  yes   |  yes  |   all   |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/sanitizeResult.ts) |

**Arguments**

| Argument |      Type       | Default | Required | Description                                                                                                                                                           |
| :------: | :-------------: | :-----: | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  schema  | Object/Function |         |   true   | A schema where each key is the sensitive string to replace and the value is either a string to replace it with or a function that returns a string to replace it with |

```js
import { sanitizeResult } from 'feathers-fletching';

// Replace the string with a default value. This hook will
// recursively traverse every object in the result and will
// replace any occurrence of "Ab123cD" with "*****"
const sanitized = sanitizeResult({
  Ab123cD: '*****'
});

// Use a function to sanitize the key. This example
// demonstrates making the *'s the same length as the string
// it is masking. You could also use RegEx to do any kind
// of searching and replacing in the string.
const sanitized = sanitizeResult({
  Ab123cD: (string, key) => {
    let mask = '';
    for (i = 0; i < string.length; i++) {
      mask = mask + '*';
    }
    return string.replace(key, mask);
  }
});

app.service('api/albums').hooks({
  after: {
    all: [sanitized]
  }
});

app.service('api/albums').find();

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

// Let's use an example where we accidentally leak some sensitive data into
// the result, not because it is data on the actual result, but because
// we made a mistake in our code and leaked an environment variable.
const attachStripeResult = async (context) => {
  const stripe_id = context.result.stripe_id;
  const stripe_key = context.app.get('stripeKey');
  const stripe_client = context.app.get('stripeClient');
  const result = await stripeClient.find(stripe_id, stripe_key);
  context.result.stripe = {
    stripe_key,
    result
  };
  return context;
};

// Did you catch the error? We meant to return the user's stripe result
// along with the stripe_id...but we accidentally returned our own secret
// stripe key. Uh Oh! By using the sanitizeResult hook, we safeguard
// ourselves against this type of mistake.
```

## stashable

Stash the result of an update, patch, or remove before mutating it.

Stashing a document in a hook so that it can be compared is a common practice. This is accomplished easily enough and hardly worth a custom hook. But, when working with multiple hooks that may or may not need that stashed record, it becomes difficult keep track of if the document has already been stashed or not. The `stashable` hook stashes a memoized version of the promise, rather than the result. This allows you to call `const stashed = await context.params.stashed()` multiple times but only actually call the underlying stash function once.

**Context**

| Before | After |        Methods        | Multi |                                               Source                                                |
| :----: | :---: | :-------------------: | :---: | :-------------------------------------------------------------------------------------------------: |
|  yes   |  no   | update, patch, remove |  yes  | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/stashable.ts) |

**Arguments**

|     Argument     |       Type       |                                               Default                                                | Required | Description                                                              |
| :--------------: | :--------------: | :--------------------------------------------------------------------------------------------------: | :------: | ------------------------------------------------------------------------ |
| option.propName  |      String      |                                              `stashed`                                               |  false   | The name of the property on context.params to place the stashed function |
| option.stashFunc | Function/Promise | [See source](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/hooks/stashable.ts) |  false   | A function/promise that returns the document/documents to be stashed     |

```js
import { stashable } from 'feathers-fletching';

const stashed = stashable();

app.service('api/albums').hooks({
  before: {
    update: [stashed, hook1, hook2],
    patch: [stashed, hook1, hook2],
    remove: [stashed, hook1, hook2]
  }
});

const hook1 = async (context) => {
  // Calls the stash function for the first time
  const stashed = await context.params.stashed();
};

const hook2 = async (context) => {
  // Returns a memoized promise (does not call DB again)
  const stashed = await context.params.stashed();
};
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
    // Use the stashed record to do something else
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

    // Eww...this is gross. The record may or may not be stashed
    // yet so we have to check and stash it if not.
    if (!context.params.stashed) {
      context.params.stashed = await context.service.get(context.id);
    }

    // Use the stashed record to do something else
  }
  return context;
}

// This is better for performance because we only stash the record when/if
// we need it. But, the code is bulky and specific. With a long chain of
// hooks this becomes cumbersome and unwieldy.


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
    // Use the stashed record to do something else
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
const stashFunc = (context) => {
  if (context.id === null) {
    const findParams = Object.assign({}, context.params, { paginate: false });
    return context.service.find(findParams);
  }

  return context.service.get(context.id, context.params);
};

// You can also pass in your own function/params to handle the
// stashing of the document how you see fit
const myStashFunc = (context) => {};

const stashed = stashable({ stashFunc: myStashFunc });
```
