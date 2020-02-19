const { BadRequest } = require('@feathersjs/errors');
const { skippable, checkContext } = require('../lib');

module.exports = skippable('paginateByPage', context => {
  checkContext(context, 'before', null, 'paginateByPage');
  if (!context.params.query) {
    return context;
  }
  if (
    context.params.query.$page !== undefined &&
    context.service.options &&
    context.service.options.paginate &&
    context.service.options.paginate.default
  ) {
    const { $page } = context.params.query;
    const { default: defaultPagination } = context.service.options.paginate;
    delete context.params.query.$page;
    if (isNaN(Number($page)) || $page < 1) {
      throw new BadRequest('$page parameter must be a number greater than 1');
    }
    context.params.query.$skip = $page * defaultPagination - defaultPagination;
  }
  return context;
});
