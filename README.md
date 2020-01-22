# feathers-fletching
Hooks, services, and plugins for feathers.js

```
yarn add feathers-fletching
```

## Notes
All feathers-fletching hooks are skippable by default. This means that each hook can be skipped by calling a service with the param `skipHooks` as an array of the names of the feathers-flecthing hooks that you want to skip. See also the `skippable` utils function docs on how to make your own hooks, or other library hooks, skippable as well.
```js
app.service('posts').find({ skipHooks: ['withResult'] });
```

## Documentation
 - [withResult](#withResult) - Add or overwrite properties onto the `context.result` or `context.result.data`. Useful for joining/populating records and creating virtual properties.

 - [withoutResult](#withoutResult) - Remove properties from the `context.result` or `context.result.data`. Similar to a "protect" hook.

 - [withData](#withData) - Add or overwrite properties to the `context.data` (can handle `context.data` that is an array). Useful for adding server side rules to data.

 - [withoutData](#withoutData) - Remove properties from the `context.data` (can handle `context.data` that is an array). Useful for adding server side rules to data.

 - [withQuery](#withQuery) - Add or overwrite properties to the `context.params.query`. Useful for enforcing server side ACL and query rules.

 - [withoutQuery](#withoutQuery) - Remove properties from the `context.params.query`. Useful for enforcing server side ACL and query rules.

 - [joinQuery](#joinQuery) - A database agnostic hooks that allows you to query "joined" records on any service. Works with all official feathers-database-adapters as well as any service that follows the same conventions.

## withResult

Add or overwrite properties to the `context.result` or `context.result.data` of a method call. This hook can handle a single result object, an array of result objects, or an array at `result.data`.

```js
import { withResult } from 'feathers-fletching';

/*
  context.result = {
    title: 'My first post',
    body: 'Some really long text!',
    author_id: 123
  }
*/

const withResults = withResult({

  status: 'draft', // return some primitive: number, bool, obj, string, etc

  summary: (result, context, prepResult) => {
    // Return the result of a function that was given the args
    // result, context, prepResult
    return result.body.substring(0, 4);
  },

  author: (result, context, prepResult) => {
    // Return a promise. Useful for populating/joining records
    return context.app.service('authors').get(result.author_id);
  },

  author_profile: (result, context, prepResult) => {
    // Keys are iterated over syncronously in order of their definition.
    // This means that `status`, `summary`, and `author` will all be present
    // by the time this `author_profile` virtual is run. We can use the
    // `author` virtual here because it has already been populated
    if (author.is_public) {
      return context.app.service('profiles')
        .find({ author_id: result.author_id });
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
    title: 'My first post',
    body: 'Some really long text!',
    author_id: 123,
    status: 'draft',
    summary: 'Some'
    author: { ... },
    author_profile: null
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

  status_code: (data, context, statuses) => {
    const currentStatus = statuses.find(status => status.name === data.status);
    return currentStatus.code;
  },

  next_status_code: (data, context, statuses) => {
    const currentIndex = statuses.findIndex(
      status => status.name === data.status
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

- `virtuals` - (required) An object where each key will be the name of a property to be added to the `context.result` and each value is either a primitive, function, or promise.

- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

Note that the virtuals functions are run syncronously in order of their definition. Also note that if `context.result` (or `context.result.data`) is an array, then the `result` arg in each virtuals function `(result, context, prepResult) => {}` is the individual item in that array, not the whole array. When `context.result` (or `context.result.data`) is an array, the withResult virtuals are applied to each item in the array and this is run asyncrounously via `Promise.all()`.

## withoutResult

Remove properties from the `context.result` or `context.result.data` of a method call. This hook can handle a single result object, an array of result objects, or an array at `result.data`.

If you think of `withResult` (or any of the `with*` hooks) similar to `Array.protype.map`, you can think of the withoutResult (or any of the `without*` hooks) as similar to `Array.protype.filter`. For each virtual in the virtual object, if the value returns a truthy value it will be kept and if it returns a falsey value it will be filtered.

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

- `virtuals` - (required) An object where each key will be the name of a property to be potentially filtered from `context.data`. Return a truthy value to keep the value and return a falsey value to remove it.

- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

## withData

Add or overwrite properties to the `context.data` of a method call. This hook can handle a single data object or an array of data objects when create/update/patch multiple items. See the [withResult](#withResult) docs for more detailed info about how virtuals and prepFunc work.

```js
import { withData } from 'feathers-fletching';

/*
  context.data = {
    user_id: 456,
    email: '    JCASH@EXAMPLE.COM'
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
    if (data.email) {
      return data.email.trim().toLowerCase();
    }
  }
});

/*
  context.data = {
    user_id: 123,
    email: 'jcash@example.com'
  }
*/
```

- `virtuals` - (required) An object where each key will be the name of a property to be added to the `context.data` and each value is either a primitive, function, or promise.

- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

## withoutData

Remove properties from the `context.data` of a method call. This hook can handle a single data object or an array of data objects when create/update/patch multiple items. See the [withoutResult](#withoutResult) docs for more detailed info about how virtuals and prepFunc work in the `without*` hooks.

```js
import { withoutData } from 'feathers-fletching';

/*
  context.data = {
    name: 'Johnny Cash',
    role: 'admin'
  }
*/

const withoutDatas = withoutData({
  role: (data, context, prepResult) => {
    // If the authenticated user is an admin,
    // they can change other users' roles
    return context.params.user.role === 'admin';
  }
});

/*
  // if authenticated user is admin
  context.data = {
    name: 'Johnny Cash',
    role: 'admin'
  }

  // if authenticated user is NOT admin
  context.data = {
    name: 'Johnny Cash'
  }
*/

```

- `virtuals` - (required) An object where each key will be the name of a property to be potentially filtered from `context.data`. Return a truthy value to keep the value and return a falsey value to remove it.

- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

## withQuery

Add or overwrite properties to the `context.params.query` of a method call. See the [withResult](#withResult) docs for more detailed info about how virtuals and prepFunc work.

This hook is useful for create "ACL" rules by enforicing some queries are only added via the server.

This hook is also useful for offering the client a simple query interface that you can then use to create more complicated queries.

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
    // this parameter, so we will use it to create a real query.
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
    author_id: 123,
    created_at: { $gte: ...some date, $lte: ...some date }
  }
*/
```

- `virtuals` - (required) An object where each key will be the name of a property to be added to the `context.params.query` and each value is either a primitive, function, or promise.

- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

## withoutQuery

Remove properties from the `context.params.query` of a method call.  See the [withoutResult](#withoutResult) docs for more detailed info about how virtuals and prepFunc work in the `without*` hooks.

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

- `virtuals` - (required) An object where each key will be the name of a property to be potentially filtered from `context.params.query`. Return a truthy value to keep the value and return a falsey value to remove it.

- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

## joinQuery

Query across services for "joined" records on any database type. This hook relies on the service interface, rather than the database, to query across services allowing you to query similar to a relational database even on services that are NoSQL or even those that do not have a database at all.

```js
import { joinQuery } from 'feathers-fletching';

/*

  "authors" collection via service `app.service('api/authors')`
  [
    { id: 123, name: 'Johnny Cash' },
    { id: 456, name: 'Patsy Cline' }
  ]

  "posts" collection via `app.service('api/posts')`
  [
    { title: 'The Man in Black', author_id: 123 },
    { title: 'I Wont Back Down', author_id: 123 },
    { title: 'Life in Nashville', author_id: 456 }
  ]
*/

// Hook added to the 'api/posts' service
const joinQueries = joinQuery({
  author: {
    service: 'api/authors',
    targetKey: 'author_id',
    foreignKey: 'id'
  }
});


// Notice how were are querying on the joined `author` prop
// by passing it `{ name: 'Johnny Cash' }` which will only return
// posts where the author's name is "Johnny Cash"
const posts = await app.service('api/posts').find({
  query: {
    author: { name: 'Johnny Cash' }
  }
});

/*
  context.params.query = {
    author_id: { $in: [123] }
  }
*/

/*
  posts = [
    { title: 'The Man in Black', author_id: 123 },
    { title: 'I Wont Back Down', author_id: 123 }
  ]
*/

```

- `options` - (required) An object with all the following required props
  - `service` - The string name of the service to query against
  - `targetKey` - The name of the key that exists on the collection this
                service is querying
  - `foreignKey` - the name of the key on the foreign record. Generally this
                will be `id` or `_id`

## License

[MIT](LICENSE).
