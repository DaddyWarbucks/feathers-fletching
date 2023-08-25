# Overview

To get started

```
yarn add feathers-fletching
```

- [Hooks API](./hooks.md) - The API for the available hooks
- [Plugins API](./plugins.md) - The API for the available plugins
- [Utilities API](./utilities.md) - The API for the available utility methods

`feathers-fletching` is a collection of useful [Feathers hooks](https://docs.feathersjs.com/api/hooks.html).

If you are not familiar with Feathers or hooks, head over to the [Feathers guide](https://docs.feathersjs.com/guides/) to get an idea how to quickly and easily build real-time applications and REST APIs.

This library is heavily inspired by `feathers-hooks-common`, `feathers-plus`, and many others. Thanks to all of the great Feathers community and maintainers!

# Philosophy

Some of core building blocks of any feathers application are the `context.data`, `context.params.query` and `context.result`. Almost any problem can be overcome by working with these three properties within hooks. There many hooks in the feathers community that do this under very specific names and pretenses. For example, any `protect` hook that you may use is _removing data from the `context.result`_. Any `join`, `populate`, or `fastJoin` hook that you use is _modifying data on the `context.result`_. Any `preventChange` hook is _removing data from the `context.data`_.

With that in mind, feathers-fletching has a core set of hooks often called the `with*` and `without*` hooks used for modifying these three properties. These hooks offer a common, powerful way to interact with these three properties. They are inspired by the resolver pattern that allows you to manipulate data within these properties via async functions. This means that with the `with*` and `without*` hooks, you can accomplish the same tasks as the hooks mentioned above.

For example

- if you want a `protect` hook that ensures passwords are not returned, use `withoutResult(['password'])`

- if you want a `preventChange` hook that ensures emails are not changed, use `withoutData(['email'])`

- if you want a `preventChange` hook that ensures emails are not changed by anyone other than admin, use `withoutData({ email: (result, context) => context.params.user.role === admin })`

- if you want a `join` hook that populates records, use `withResult({ artist: (result, context) => context.app.service('artists').get(result.id) })`

- if you want an access control hook that ensures users can only query by their own records use `withQuery({ user_id: (result, context) => context.params.user.id })`

The `with*` and `without*` hooks give you a way to powerfully manipulate each property of the data, query, and result. It also handles all of feathers cases under the hood so you don't have to, such as when `context.data` is in array for `{ multi: true }` or when the paginated `context.result.data` is present instead of just `context.result`.
