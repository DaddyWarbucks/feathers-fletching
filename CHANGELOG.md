# CHANGELOG.md

## 1.13.2 (2022-01-27)

joinQuery:

  - Now supports nested $and/$or queries
  - Defaults `makeKey` option to `key => key.toString()`
  - Adds and defaults `overwrite` option to `false`
  - More accurate sorting