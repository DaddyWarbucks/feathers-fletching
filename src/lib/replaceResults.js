module.exports = (context, results) => {
  if (context.method === 'find') {
    if (context.result && context.result.data) {
      context.result.data = Array.isArray(results) ? results : [results];
    } else {
      context.result = Array.isArray(results) ? results : [results];
    }
  } else {
    context.result = results;
  }
};
