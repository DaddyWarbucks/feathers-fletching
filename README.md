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
 - [withResult](#withResult) - Add properties onto the `context.result` or `context.result.data`. Useful for joining/populating records and creating virtual properties.
 - [withData](#withData) - Add properties to the `context.data` (can handle `context.data` that is an array). Useful for adding server side rules to data.
 - [withQuery](#withQuery) - Add properties to the `context.params.query`. Useful for enforcing server side ACL and query rules.
 - [protect](#protect) - Protect properties in the `context.result` or `context.result` from being returned.

## withResult

Add properties to the `context.result` or `context.result.data` of a method call. This hook can handle a single result object, or an array of result objects, or an array at `result.data`.

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
    // This means that status, summary, and author will all be present
    // by the time this comments virtual is run. We can use the
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
const withResults = withResult({

  average_album_rating: (data, context, albums) => {
    const ratings = albums.reduce(( rating, album ) => {
      return rating + album.rating;
    });
    return ratings / albums.length;
  },

  total_albums: (data, context, prepResult) => albums.length

},

  async context => {
    // This function is run before iterating over the virtuals object and its
    // result is passed to each virtuals function.
    const albums = await context.app.service('albums')
      .find({ query: { id: { $in: [context.result.albums] } } })
      .then(result => result.data);
    return albums;
  }

);
```

- `virtuals` - (required) An object where each key will be the name of a property to be added to the `context.result` and each value is either a primitive, function, or promise.
- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

Note that the virtuals functions are run syncronously in order of their definition. Also note that if `context.result` (or `context.result.data`) is an array, then the `result` arg in each virtuals function `(result, context, prepResult) => {}` is the individual item in that array, not the whole array. When `context.result` (or `context.result.data`) is an array, the withResult virtuals are applied to each item in the array and this is run asyncrounously via `Promise.all()`.

## withData

Add properties to the `context.data` of a method call. This hook can handle a single data object or an array of data objects when create/update/patch multiple items. See the [withResult](#withResult) docs for more detailed info about how virtuals and prepFunc work.

```js
import { withData } from 'feathers-fletching';

/*
  context.data = {
    author_id: 456
  }
*/

const withDatas = withData({
  author_id: (data, context, prepResult) => context.params.user.id,
});

/*
  context.data = {
    author_id: 123
  }
*/
```

- `virtuals` - (required) An object where each key will be the name of a property to be added to the `context.data` and each value is either a primitive, function, or promise.
- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

Note that the virtuals functions are run syncronously in order of their definition. Also note that if `context.data` is an array, then the `data` arg in each virtuals function `(data, context, prepResult) => {}` is the individual item in that array, not the whole array. When `context.data` is an array, the withData virtuals are applied to each item in the array and this is run asyncrounously via `Promise.all()`.

** Pro Tip: This hook is useful for forcing properties onto data that cannot change. For example, you may always force some `user_id` onto a record from the `context.params.user` to ensure that the `user_id` is _always_ from the authorized user instead of trusting the client to send the proper `user_id` **

## withQuery

Add properties to the `context.query` of a method call. See the [withResult](#withResult) docs for more detailed info about how virtuals and prepFunc work.

```js
import { withQuery } from 'feathers-fletching';

/*
  context.params.query = {}
*/

const withQueries = withQuery({
  status: (query, context, prepResult) => {
    if (context.user.permissions.includes('admin')) {
      // If this user is an admin they can see all posts
      return { $in: ['draft', 'posted', 'removed'] };
    } else {
      // else they can only see posted posts
      return 'posted';
    }
  }
});

/*
  context.params.query = {
    status: { $in: ['draft', 'posted', 'removed'] }
  }

  or

  context.params.query = {
    status: 'posted'
  }
*/
```

- `virtuals` - (required) An object where each key will be the name of a property to be added to the `context.params.query` and each value is either a primitive, function, or promise.
- `prepFunc` - (optional) A function, or promise, that takes argument `context`. The result of this function will be passed to each serializer function in the virtuals object.

** Pro Tip: This hook is useful forcing properties onto query that the client should not have control of. For example, you may always force some `user_id` onto a query from the `context.params.user` to ensure that only records created by this user are returned. Even if the client sends `{ user_id: 456 }` which is some other user's id, this hook will overwrite that `user_id` to ensure the query cannot be spoofed. **

## protect

Omit properties from the `context.result` or `context.result.data` from being returned from the service call.

```js
import { protect } from 'feathers-fletching';

/*
  context.params.result = {
    name: 'Johny Cash',
    credit_card: '1234 4567 8910 1112',
    ssn: '111-11-1111'
  }
*/

const protectHook = protect('credit_card', 'ssn');

/*
  context.params.result = {
    name: 'Johny Cash',
  }
*/

// Similar to how you can skip whole hooks in feathers-flething by
// passing { skipHooks: ['protect'] }, you can also skip protecting
// only certain fields of the protect hook.

// Skip the whole protect hook. Similar to how you can skip any
// feathers-fletching hook
const user = await app.service('users').get(123, { skipHooks: ['protect'] });

/*
  context.params.result = {
    name: 'Johny Cash',
    credit_card: '1234 4567 8910 1112',
    ssn: '111-11-1111'
  }
*/

// Skip protecting just the credit_card property, but do still protect
// the ssn property
const user = await app.service('users')
  .get(123, { skipHooks: ['protect.credit_card'] });

/*
  context.params.result = {
    name: 'Johny Cash',
    credit_card: '1234 4567 8910 1112'
  }
*/

```

- `fields` - (required) Each argument passed to the protect hook is a field to be omitted from the result.

** Pro Tip: This hook protects on both INTERNAL AND EXTERNAL calls. Unlike some other protect hooks that only protect on "external" calls (aka calls made over REST or socket), this hook protects on calls made internally as well. This is done as an extra layer of security to ensure sensitive information does not end up in logs, etc. It also ensures that when "populating" records onto other records, via `withResult` or any other method where you call another service internally, that the proper data is protected.
For example,
```js

// `users` service is using feathers-fletching to protect the PW
import { protect } from 'feathers-fletching';
const protectHook = protect('password');

// The 'posts' service wants to populate the user from the
// `users` service. Because the `users` service is using
// feathers-fletching protect hook, the PW will not be returned.
// feathers-fletching protects against internal calls. :)
const withResults = withResult({
  user: (result, context) => {
    return context.app.service('users').get(result.user_id);
  }
});

// But, if using some other library's protect hook...
// `users` service is using the protect hook from
// @feathersjs/authentication-local
const { protect } = require('@feathersjs/authentication-local').hooks;
const protectHook = protect('password');


// The 'posts' service wants to populate the user from the
// `users` service. Because this is an internal call and the
// @feathersjs/authentication-local protect hook DOES NOT PROTECT
// INTERNAL CALLS the PW will now be populated on this post's
// user and sent to the client :(
const withResults = withResult({
  user: (result, context) => {
    return context.app.service('users').get(result.user_id);
  }
});
```

This also means that this protect hook is not compatible with feathers-authentication (using the protect hook on the users service), because if you `protect('password')` then when the auth service calls the users service (an internal call), the PW is not returned. You should either use the protect hook from feathers-authentication or extend the authentication service to handle this. **

## License

[MIT](LICENSE).
