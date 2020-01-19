const virtualsSerializer = require('./virtualsSerializer');
const { omit, pick } = require('./utils');

module.exports = async (data, virtuals, context, prepFunc) => {
  if (Array.isArray(data)) {
    // Create an array of "copies" of the items that
    // only include the keys to be filtered
    const filterMaps = data.map(item => pick(item, ...Object.keys(virtuals)));

    // Run the virtualsSerializer on each item. The result of the serializer
    // works similar to an array.filter() where if the result is a truthy
    // value it will be kept and will be omitted if falsey
    const serialized = await virtualsSerializer(
      data,
      virtuals,
      context,
      prepFunc
    );

    // Filter out keys where the serialized result is not truthy
    const filtered = serialized.map((item, index) => {
      const omitKeys = Object.keys(item).filter(key => !item[key]);
      return omit(data[index], ...omitKeys);
    });

    return filtered;
  } else {
    const filterMap = pick(data, ...Object.keys(virtuals));

    const serialized = await virtualsSerializer(
      filterMap,
      virtuals,
      context,
      prepFunc
    );

    const omitKeys = Object.keys(serialized).filter(key => !serialized[key]);

    return omit(data, ...omitKeys);
  }
};
