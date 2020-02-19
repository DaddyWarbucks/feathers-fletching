# Plugins

Plugins are functions that are used to configure the app instance and are used via the `app.configure(app => {})` method.

## strictRestQuery

Configure the Express query parser to parse string numbers and booleans  to proper types. When using sockets, the query is parsed via `JSON.parse` which means that the query maintains its types for things like numbers, booleans, etc. But when using REST, Express.js uses `qs` to parse query strings and this means that numbers and booleans must be converted to strings. This plugin manually sets the underlying `qs` instance to parse query strings more like `JSON.parse` so that queries are parsed exactly the same whether coming from internal, sockets, or rest.

By default, Express.js only allows you to minimally configure how queries are parsed via the

```js
// Setting { extended: true } signals to express to use the `qs`
// library under the hood, but it does not allow you to pass
// options to the `qs.parse()` function.
app.use(express.urlencoded({ extended: true }));

// This will result in a query like
query = {
  boolean: 'true',
  number: '123',
}
```

Use the `strictRestQuery` plugin to manually set the query parser to be more consistent across transports.

```js
import { strictRestQuery } from 'feathers-fletching';
app.configure(strictRestQuery());

// This will result in a query like
query = {
  boolean: true,
  number: 123,
}
```

> Note this plugin MUST be configured early in the Express chain and before any other middleware. See [this issue](https://github.com/expressjs/express/issues/3454) for more details

> See the [Rest Client Docs](https://docs.feathersjs.com/api/client/rest.html#extending-rest-clients) for information about how to extend a Feathers Rest Client to handle `null`. See also this [great article](https://mattchaffe.uk/posts/feathersjs-rest-queries-with-null) for more information about how this works.

**Arguments**

| Argument | Type | Default | Required | Description |
| :-: | :-: | :-:  | :-: | - |
| options | Object | [View Code](https://github.com/daddywarbucks/feathers-fletching/blob/master/src/plugins/strictRestQuery.js) | false | `qs` options, See [qs options](https://github.com/ljharb/qs#parsing-objects) |

```js
 defaultOptions = {
  arrayLimit: 100,
  depth: 20,
  parameterLimit: 2000,
  strictNullHandling: true,
  decoder // See source code
}
```
