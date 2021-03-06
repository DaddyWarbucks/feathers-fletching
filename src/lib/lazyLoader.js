module.exports = class LazyLoader {
  constructor(context, loaderCache) {
    this.context = context;
    this.loaderCache = loaderCache || new Map();
    this.loader = this.loader.bind(this);
  }

  loader(serviceName) {
    const cached =
      this.loaderCache.get(serviceName) ||
      new ServiceLoader(this.context.app.service(serviceName));

    this.loaderCache.set(serviceName, cached);

    return cached;
  }
};
