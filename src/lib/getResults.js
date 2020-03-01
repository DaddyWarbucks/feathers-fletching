module.exports = context => {
  return context.method === 'find'
    ? context.result.data || context.result
    : context.result;
};
