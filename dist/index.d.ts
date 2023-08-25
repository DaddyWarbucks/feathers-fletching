import * as _feathersjs_feathers from '@feathersjs/feathers';
import { HookContext, Application } from '@feathersjs/feathers';
import { LRUCache } from 'lru-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';

type Promisable<T> = T | Promise<T>;
type SetPartial<T, K extends keyof T = keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

declare const skippable: (hookName: string, hookFunc: (context: HookContext) => Promisable<undefined | HookContext>) => (context: any) => any;

type ContextCacheMapOptions = {
    map: LRUCache<any, any>;
} | LRUCache.Options<any, any, any>;
declare class ContextCacheMap {
    map: LRUCache<any, any>;
    constructor(options?: ContextCacheMapOptions);
    makeCacheKey(context: any): string;
    makeId(id: any): any;
    makeResultId(record: any): any;
    cloneResult(context: any): any;
    get(context: any): Promise<any>;
    set(context: any): Promise<LRUCache<any, any, unknown>>;
    clear(context: any): Promise<void>;
}

type SanitizeSchema = {
    [key: string]: string | ((str: string, key: any) => string);
};

type VirtualFn = (data: Record<string, any>, context: HookContext, prepResult: Record<string, any>) => any;
type Virtuals = Record<string, VirtualFn>;
type PrepFunction = (context: HookContext) => Promisable<any>;

declare const contextCache: <H extends HookContext<_feathersjs_feathers.Application<any, any>, any> = HookContext<_feathersjs_feathers.Application<any, any>, any>>(cacheMap: ContextCacheMap) => (context: H) => Promise<H>;

type JoinQueryEntry = {
    overwrite: boolean;
    makeKey: (key: any) => any;
    makeParams: (defaultParams: any, context: HookContext, option: JoinQueryEntry) => any;
    service: string;
    targetKey: string;
    foreignKey: string;
};
type JoinQueryOptions = {
    [key: string]: SetPartial<JoinQueryEntry, 'overwrite' | 'makeKey' | 'makeParams'>;
};
declare const joinQuery: <H extends HookContext<_feathersjs_feathers.Application<any, any>, any>>(_options: JoinQueryOptions) => (context: H) => Promise<H>;

declare const jsonQueryStringify: (options?: {
    overwrite: boolean;
    propName: string;
}) => (context: HookContext) => HookContext<_feathersjs_feathers.Application<any, any>, any>;
declare const jsonQueryParse: (options?: {
    overwrite: boolean;
    propName: string;
}) => (context: HookContext) => HookContext<_feathersjs_feathers.Application<any, any>, any>;
declare const jsonQueryClient: (app: any) => void;
declare const jsonQueryServer: (app: any) => void;

declare const preventChange: (virtuals: any, prepFunc?: () => void) => (context: any) => Promise<any>;

type RateLimitOptions = {
    makeKey?: (context: HookContext) => string;
    makePoints?: (context: HookContext) => number;
};
declare const rateLimit: (rateLimiter: RateLimiterMemory, _options?: RateLimitOptions) => (context: any) => Promise<any>;

type SanitizeErrorOptions = SanitizeSchema | ((context: any) => SanitizeSchema);
declare const sanitizeError: (options: SanitizeErrorOptions) => (context: any) => Promise<any>;

type SanitizeResultOptions = SanitizeSchema | ((context: any) => SanitizeSchema);
declare const sanitizeResult: (options: SanitizeResultOptions) => (context: any) => Promise<any>;

type SequelizeJoinQueryOptions = {
    makeIncludeOptions?: (association: any, context: HookContext) => any;
};
declare const sequelizeJoinQuery: (options?: SequelizeJoinQueryOptions) => (context: any) => any;

type StashableOptions = {
    propName?: string;
    stashFunc?: (context: HookContext) => Promise<any>;
};
declare const stashable: (_options?: StashableOptions) => (context: any) => any;

/**
 * Add data, such as defaults to context.data in a before hook.
 *
 * Note `data` could technically be an array of multiple items
 * to create/update/patch. Also note that although the keys are
 * iterated over syncronously (in order of definition on the virtuals
 * object) that if data is an array, all items in the data array
 * are run in parallel.
 *
 * The value of each property in the virtuals object can be a function,
 * a promise, a function that returns a promise, or a simple value. The
 * virtual should return the value to be attached to the key and should
 * not mutate context directly.
 */
declare const withData: (virtuals: Virtuals, prepFunc?: PrepFunction) => (context: any) => Promise<any>;

declare const withQuery: (virtuals: Virtuals, prepFunc?: PrepFunction) => (context: any) => Promise<any>;

declare const withResult: (virtuals: Virtuals, prepFunc?: PrepFunction) => (context: any) => Promise<any>;

declare const withoutData: (virtuals: Virtuals, prepFunc?: PrepFunction) => (context: any) => Promise<any>;

declare const withoutQuery: (virtuals: Virtuals, prepFunc?: PrepFunction) => (context: any) => Promise<any>;

declare const withoutResult: (virtuals: Virtuals, prepFunc?: PrepFunction) => (context: any) => Promise<any>;

type StrictRestQueryOptions = {
    arrayLimit?: number;
    depth?: number;
    parameterLimit?: number;
    strictNullHandling?: boolean;
};
declare const strictRestQuery: (opts?: StrictRestQueryOptions) => (app: Application) => Application<any, any>;

export { ContextCacheMap, JoinQueryEntry, JoinQueryOptions, RateLimitOptions, SanitizeErrorOptions, SanitizeResultOptions, SequelizeJoinQueryOptions, StashableOptions, StrictRestQueryOptions, contextCache, joinQuery, jsonQueryClient, jsonQueryParse, jsonQueryServer, jsonQueryStringify, preventChange, rateLimit, sanitizeError, sanitizeResult, sequelizeJoinQuery, skippable, stashable, strictRestQuery, withData, withQuery, withResult, withoutData, withoutQuery, withoutResult };
