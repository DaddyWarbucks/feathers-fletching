const { insertHook } = require('./utils');

module.exports.defaultTransactionFuncs = {
  prep: async ctx => {
    if (ctx.method === 'create') {
      return;
    }
    if (ctx.id === null) {
      ctx.stashed = await ctx.service._find({ ...ctx.params, paginate: false });
      return;
    }
    ctx.stashed = await ctx.service._get(ctx.id, ctx.params);
  },
  rollback: async ctx => {
    // TODO: Use the ctx.service.id to use the proper model
    // id instead of just _id
    if (ctx.method === 'create' && ctx.result) {
      return ctx.service._remove(ctx.result._id);
    }
    if (ctx.method === 'update' && ctx.result) {
      return ctx.service._update(ctx.id, ctx.stashed);
    }
    if (ctx.method === 'patch' && ctx.result) {
      if (ctx.id !== null) {
        return ctx.service._patch(ctx.id, ctx.stashed);
      }
      return Promise.all(
        ctx.stashed.map(stashed => {
          return ctx.service._patch(stashed.id, stashed);
        })
      );
    }
    if (ctx.method === 'remove' && ctx.result) {
      return ctx.service._create(ctx.stashed);
    }
  },
  commit: ctx => {
    ctx.service.emit(ctx.event, ctx.result);
  }
};

const handleResult = (transaction, ctx, result, funcs) => {
  ctx.result = result;
  handleFuncs(transaction, ctx, funcs);
  return Promise.resolve(result);
};

const handleError = (transaction, ctx, error, funcs) => {
  ctx.error = error;
  handleFuncs(transaction, ctx, funcs);
  throw error;
};

const handleFuncs = (transaction, ctx, funcs) => {
  if (funcs.rollback) {
    transaction.rollbacks.push((...args) => funcs.rollback(ctx, ...args));
  }
  if (funcs.commit) {
    transaction.commits.push((...args) => funcs.commit(ctx, ...args));
  }
};

const handlePromise = (transaction, promise) => {
  const prom = promise();
  transaction.promises.push(prom);
  return prom;
};

const getOptions = (params, service) => {
  const options = {
    ...(service.options && service.options.transaction),
    ...params.transactionOptions
  };

  const funcs = {
    prep: options.prep,
    rollback: options.rollback,
    commit: options.commit
  };

  return {
    options,
    funcs
  };
};

const getCtx = ({ id, data, params, service, method, app }) => {
  return {
    id,
    data,
    params,
    service,
    method,
    app,
    event: app.eventMappings[method],
    path: Object.keys(app.services).find(path => app.services[path] === service)
  };
};

module.exports.extendTransactionService = (Service, app) => {
  return class TransactionService extends Service {
    constructor({ transaction, ...restOptions }, ...restArgs) {
      super(restOptions, ...restArgs);
      this.options = {
        ...this.options,
        transaction
      };
    }

    async create(data, params = {}) {
      const { transaction } = params;

      if (!transaction) {
        return super.create(data, params);
      }

      const { funcs } = getOptions(params, this);

      const promise = async () => {
        const ctx = getCtx({
          data,
          params,
          service: this,
          method: 'create',
          app
        });

        if (funcs.prep) {
          await funcs.prep(ctx);
        }

        return super
          .create(data, params)
          .then(result => handleResult(transaction, ctx, result, funcs))
          .catch(error => handleError(transaction, ctx, error, funcs));
      };

      return handlePromise(transaction, promise);
    }

    async update(id, data, params = {}) {
      const { transaction } = params;

      if (!transaction) {
        return super.update(id, data, params);
      }

      const { funcs } = getOptions(params, this);

      const promise = async () => {
        const ctx = getCtx({
          id,
          data,
          params,
          service: this,
          method: 'update',
          app
        });

        if (funcs.prep) {
          await funcs.prep(ctx);
        }

        return super
          .update(id, data, params)
          .then(result => handleResult(transaction, ctx, result, funcs))
          .catch(error => handleError(transaction, ctx, error, funcs));
      };

      return handlePromise(transaction, promise);
    }

    async patch(id, data, params = {}) {
      const { transaction } = params;

      if (!transaction) {
        return super.patch(id, data, params);
      }

      const { funcs } = getOptions(params, this);

      const promise = async () => {
        const ctx = getCtx({
          id,
          data,
          params,
          service: this,
          method: 'patch',
          app
        });

        if (funcs.prep) {
          await funcs.prep(ctx);
        }

        return super
          .patch(id, data, params)
          .then(result => handleResult(transaction, ctx, result, funcs))
          .catch(error => handleError(transaction, ctx, error, funcs));
      };

      return handlePromise(transaction, promise);
    }

    async remove(id, params = {}) {
      const { transaction } = params;

      if (!transaction) {
        return super.remove(id, params);
      }

      const { funcs } = getOptions(params, this);

      const promise = async () => {
        const ctx = getCtx({
          id,
          params,
          service: this,
          method: 'remove',
          app
        });

        if (funcs.prep) {
          await funcs.prep(ctx);
        }

        return super
          .remove(id, params)
          .then(result => handleResult(transaction, ctx, result, funcs))
          .catch(error => handleError(transaction, ctx, error, funcs));
      };

      return handlePromise(transaction, promise);
    }
  };
};

class TransactionManager {
  constructor() {
    this.promises = [];
    this.commits = [];
    this.rollbacks = [];
  }

  // Await all promises to resolve before allowing commit/rollback.
  // This is helpful when a promise throws in a Promise.all() and we
  // need to be sure that all the other promises have a chance to
  // push their functions before the error is handled.
  async resolve() {
    return {
      resolved: await Promise.allSettled(this.promises),
      promises: this.promises,
      commits: this.commits,
      rollbacks: this.rollbacks
    };
  }
}

module.exports.TransactionManager = TransactionManager;

const setupTransaction = context => {
  if (!context.params.transaction) {
    context.transactionIsLocal = true;
    context.params.transaction = new TransactionManager();
  }

  context.event = null;

  return context;
};

module.exports.setupTransaction = setupTransaction;

const rollbackTransaction = async context => {
  if (context.transactionIsLocal && context.params.transaction) {
    const { rollbacks } = await context.params.transaction.resolve();
    for (const rollback of rollbacks.reverse()) {
      await rollback();
    }
  }

  return context;
};

module.exports.rollbackTransaction = rollbackTransaction;

const commitTransaction = async context => {
  if (context.transactionIsLocal && context.params.transaction) {
    const { commits } = await context.params.transaction.resolve();
    for (const commit of commits) {
      await commit();
    }
  }

  return context;
};

module.exports.commitTransaction = commitTransaction;

const extendTransactionHooks = (_hooks, transactionHooks = {}) => {
  const hooks = { ..._hooks };
  const {
    setupTransaction,
    rollbackTransaction,
    commitTransaction
  } = transactionHooks;

  if (setupTransaction) {
    insertHook(hooks, 'before.create.0', setupTransaction);
    insertHook(hooks, 'before.update.0', setupTransaction);
    insertHook(hooks, 'before.patch.0', setupTransaction);
    insertHook(hooks, 'before.remove.0', setupTransaction);
  }

  if (rollbackTransaction) {
    insertHook(hooks, 'error.create.0', rollbackTransaction);
    insertHook(hooks, 'error.update.0', rollbackTransaction);
    insertHook(hooks, 'error.patch.0', rollbackTransaction);
    insertHook(hooks, 'error.remove.0', rollbackTransaction);
  }

  if (commitTransaction) {
    insertHook(hooks, 'after.create.-1', commitTransaction);
    insertHook(hooks, 'after.update.-1', commitTransaction);
    insertHook(hooks, 'after.patch.-1', commitTransaction);
    insertHook(hooks, 'after.remove.-1', commitTransaction);
  }

  return hooks;
};

module.exports.extendTransactionHooks = extendTransactionHooks;
