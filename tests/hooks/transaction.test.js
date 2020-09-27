const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const { Service } = require('feathers-memory');
const {
  setupTransaction,
  commitTransaction,
  rollbackTransaction,
  defaultTransactionFuncs,
  extendTransactionService,
  extendTransactionHooks,
  TransactionManager
} = require('../../src/lib/transaction');

describe('transaction', () => {
  // const app = feathers();

  // app.use('api/albums', new Service());

  // app.use(
  //   'api/artists',
  //   memory({
  //     store: {
  //       1: { id: 1, name: 'Johnny Cash' },
  //       2: { id: 2, name: 'Patsy Cline' }
  //     }
  //   })
  // );

  it('Setups a transaction : setupTransaction', async () => {
    const context = { params: {} };
    const newContext = await setupTransaction(context);

    assert(newContext.transactionIsLocal === true);
    assert(newContext.params.transaction !== undefined);
  });

  it('Continues a transaction : setupTransaction', async () => {
    const context = {
      params: {
        transaction: new TransactionManager()
      }
    };
    const newContext = await setupTransaction(context);

    assert(!newContext.transactionIsLocal);
    assert(newContext.params.transaction === context.params.transaction);
  });

  it('Commits a transaction when local : commitTransaction', async () => {
    const context = {
      transactionIsLocal: true,
      params: {
        transaction: new TransactionManager()
      }
    };
    let committed = false;

    context.params.transaction.commits.push(() => {
      committed = true;
    });

    await commitTransaction(context);

    assert(committed === true);
  });

  it('Does not commit a transaction when not local : commitTransaction', async () => {
    const context = {
      params: {
        transaction: new TransactionManager()
      }
    };
    let committed = false;

    context.params.transaction.commits.push(() => {
      committed = true;
    });

    await commitTransaction(context);

    assert(committed === false);
  });

  it('Rollsback a transaction when local : rollbackTransaction', async () => {
    const context = {
      transactionIsLocal: true,
      params: {
        transaction: new TransactionManager()
      }
    };
    let rolledBack = false;

    context.params.transaction.rollbacks.push(() => {
      rolledBack = true;
    });

    await rollbackTransaction(context);

    assert(rolledBack === true);
  });

  it('Does not rollback a transaction when not local : rollbackTransaction', async () => {
    const context = {
      params: {
        transaction: new TransactionManager()
      }
    };
    let rolledBack = false;

    context.params.transaction.rollbacks.push(() => {
      rolledBack = true;
    });

    await rollbackTransaction(context);

    assert(rolledBack === false);
  });

  it('Extends a Service to include transactions : extendTransactionService', async () => {
    const app = feathers();
    const TransactionService = extendTransactionService(Service, app);
    app.use(
      'api/albums',
      new TransactionService({
        transaction: defaultTransactionFuncs
      })
    );
    const service = app.service('api/albums');

    const validate = context => {
      assert(context.params.transaction.commits.length == 1);
      assert(context.params.transaction.rollbacks.length == 1);
    };

    service.hooks({
      after: {
        all: [validate]
      }
    });

    const created = await service.create(
      { title: 'The man in black' },
      {
        transaction: new TransactionManager()
      }
    );

    await service.update(
      created.id,
      { title: 'The man in black' },
      {
        transaction: new TransactionManager()
      }
    );

    await service.patch(
      created.id,
      { title: 'The man in black' },
      {
        transaction: new TransactionManager()
      }
    );

    await service.remove(created.id, {
      transaction: new TransactionManager()
    });
  });

  it('Extends a set of hooks : extendTransactionHooks', async () => {
    const myHook = () => { };
    const hooks = {
      before: {
        create: [myHook],
        update: [myHook],
        patch: [myHook],
        remove: [myHook]
      },
      after: {
        create: [myHook],
        update: [myHook],
        patch: [myHook],
        remove: [myHook]
      },
      error: {
        create: [myHook],
        update: [myHook],
        patch: [myHook],
        remove: [myHook]
      }
    };

    const newHooks = extendTransactionHooks(hooks, {
      setupTransaction,
      commitTransaction,
      rollbackTransaction
    });

    Object.values(newHooks.before).forEach(hookArray => {
      assert(hookArray.indexOf(setupTransaction) === 0);
    });

    Object.values(newHooks.after).forEach(hookArray => {
      assert(hookArray.indexOf(commitTransaction) === 1);
    });

    Object.values(newHooks.error).forEach(hookArray => {
      assert(hookArray.indexOf(rollbackTransaction) === 0);
    });
  });

  it('Handles nesting transactions in multiple services', async () => {
    const app = feathers();
    const TransactionService = extendTransactionService(Service, app);
    app.use(
      'api/albums',
      new TransactionService({
        transaction: defaultTransactionFuncs
      })
    );

    app.use(
      'api/artists',
      new TransactionService({
        transaction: defaultTransactionFuncs
      })
    );

    const artistsService = app.service('api/artists');

    const createAlbum = async context => {
      await context.app.service('api/albums').create(
        {
          artist_id: context.result.id
        },
        {
          transaction: context.params.transaction
        }
      );
      return context;
    };

    artistsService.hooks({
      before: {
        create: [setupTransaction, createAlbum]
      }
    });

    await artistsService.create({ name: 'Johnny Cash' });
  });
});
