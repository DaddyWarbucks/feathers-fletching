# CHANGELOG.md

## 2.0.7 (2025-07-16)

sequelizeJoinQuery:

- Now supports nested $and/$or queries.
- No longer throws "Invalid joinQuery" error. This allows querying on nested JSONB columns like `$joined.json_column.json_field$`.

## 2.0.0 (2023-08-25)

General:

- Update to Feathers V5.
- Rewrite to Typescript and updated test framework.
- Fix error in `sequelizeJoinQuery` where similar join names like `org_user` and `user` could collide.

Breaking:

- BREAKING - All exported hooks are no longer wrapped in `skipHooks` by default. To reenable to this, use the `skipHooks` utility to wrap hooks individually.

## 1.20.4 (2022-02-27)

joinQuery:

- Now supports nested $and/$or queries.
- Adds and defaults `overwrite` option to `false`.
- More accurate sorting.
- Does not throw error when no results found on `find` method.
