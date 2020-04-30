# Utilities

Utilites are not hooks or plugins. They are common functions that are helpful for working with hooks and context;

## skippable

Wrap a hook function to make it skippable by passing `{ skipHooks: ['hookName'] }`

```js
import { skippable } from 'feathers-fletching';

const myHook = skippable('myHook', context => {
  console.log('Hello from "myHook"');
  return context;
});

// Skip hook by name
app.service('albums').find({ skipHooks: ['myHook'] });

// Skip all skippable hooks
app.service('albums').find({ skipHooks: ['all'] });

// Skip all skippable before hooks
app.service('albums').find({ skipHooks: ['before'] });

// Skip all skippable after hooks
app.service('albums').find({ skipHooks: ['after'] });

// Skip all skippable before hooks, and just "myHook" if after
app.service('albums').find({ skipHooks: ['before', 'myHook'] });


// You can also modify the skipHooks property within other hooks
const someHook = context => {
  if (context.id === 1) {
    const skipHooks = context.params.skipHooks || [];
    context.params.skipHooks = [...skipHooks, 'myHook'];
  }
  return context;
}
```