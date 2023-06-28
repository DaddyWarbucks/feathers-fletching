import { LRUCache } from "lru-cache";
import { stableStringify } from "./utils";

export type ContextCacheMapOptions =
  | {
      map: LRUCache<any, any>;
    }
  | LRUCache.Options<any, any, any>;

export class ContextCacheMap {
  map: LRUCache<any, any>;

  constructor(options?: ContextCacheMapOptions) {
    options ??= { max: 100 };
    this.map = "map" in options ? options?.map : new LRUCache(options);
  }

  makeCacheKey(context) {
    return stableStringify({
      method: context.method,
      id: context.id,
      query: context.params && context.params.query,
    });
  }

  makeId(id) {
    return id.toString ? id.toString() : id;
  }

  makeResultId(record) {
    const id = record._id || record.id;
    return this.makeId(id);
  }

  cloneResult(context) {
    return JSON.parse(JSON.stringify(context.result));
  }

  // Called before get() and find()
  async get(context) {
    const key = this.makeCacheKey(context);
    return this.map.get(key);
  }

  // Called after get() and find()
  async set(context) {
    const key = this.makeCacheKey(context);
    const result = this.cloneResult(context);
    return this.map.set(key, result);
  }

  // Called after create(), update(), patch(), and remove()
  async clear(context) {
    const { result } = context;
    const results = Array.isArray(result) ? result : [result];
    results.forEach((result) => {
      Array.from(this.map.keys()).forEach((key) => {
        const keyObj = JSON.parse(key);
        if (keyObj.method === "find") {
          // This is a cached `find` request. Any create/patch/update/del
          // could affect the results of this query so it should be deleted
          return this.map.delete(key);
        } else {
          // This is a cached `get` request
          if (context.method !== "create") {
            // If not creating, there may be a cached get for this id
            const id = this.makeId(keyObj.id);
            const recordId = this.makeResultId(result);
            if (id === recordId) {
              // Delete all `gets` that have this id
              return this.map.delete(key);
            }
          }
        }
      });
    });
  }
}
