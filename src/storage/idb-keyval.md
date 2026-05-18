# IDB-Keyval

[![npm](https://img.shields.io/npm/v/idb-keyval.svg)](https://www.npmjs.com/package/idb-keyval)

This is a super-simple promise-based keyval store implemented with IndexedDB, originally based on [async-storage by Mozilla](https://github.com/mozilla-b2g/gaia/blob/master/shared/js/async_storage.js).

It's small and tree-shakeable. If you only use get/set, the library is 295 bytes (brotli'd), if you use all methods it's 573 bytes.

[localForage](https://github.com/localForage/localForage) offers similar functionality, but supports older browsers with broken/absent IDB implementations. Because of that, it's orders of magnitude bigger (~7k).

This is only a keyval store. If you need to do more complex things like iteration & indexing, check out [IDB on NPM](https://www.npmjs.com/package/idb) (a little heavier at 1k). The first example in its README is how to create a keyval store.

## Installing

### Recommended: Via npm + webpack/rollup/parcel/etc

```sh
npm install idb-keyval
```

Now you can require/import `idb-keyval`:

```js
import { get, set } from "idb-keyval";
```

If you're targeting IE10/11, use the compat version, and import a `Promise` polyfill.

```js
// Import a Promise polyfill
import "es6-promise/auto";
import { get, set } from "idb-keyval/dist/esm-compat";
```

### All bundles

A well-behaved bundler should automatically pick the ES module or the CJS module depending on what it supports, but if you need to force it either way:

- `idb-keyval/dist/index.js` EcmaScript module.
- `idb-keyval/dist/index.cjs` CommonJS module.

Legacy builds:

- `idb-keyval/dist/compat.js` EcmaScript module, transpiled for older browsers.
- `idb-keyval/dist/compat.cjs` CommonJS module, transpiled for older browsers.
- `idb-keyval/dist/umd.js` UMD module, also transpiled for older browsers.

These built versions are also available on jsDelivr, e.g.:

```html
<script src="https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js"></script>
<!-- Or in modern browsers: -->
<script type="module">
  import { get, set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";
</script>
```

## Usage

### set:

```js
import { set } from "idb-keyval";

set("hello", "world");
```

Since this is IDB-backed, you can store anything structured-clonable (numbers, arrays, objects, dates, blobs etc), although old Edge doesn't support `null`. Keys can be numbers, strings, `Date`s, (IDB also allows arrays of those values, but IE doesn't support it).

All methods return promises:

```js
import { set } from "idb-keyval";

set("hello", "world")
  .then(() => console.log("It worked!"))
  .catch((err) => console.log("It failed!", err));
```

### get:

```js
import { get } from "idb-keyval";

// logs: "world"
get("hello").then((val) => console.log(val));
```

If there is no 'hello' key, then `val` will be `undefined`.

### setMany:

Set many keyval pairs at once. This is faster than calling `set` multiple times.

```js
import { set, setMany } from "idb-keyval";

// Instead of:
Promise.all([set(123, 456), set("hello", "world")])
  .then(() => console.log("It worked!"))
  .catch((err) => console.log("It failed!", err));

// It's faster to do:
setMany([
  [123, 456],
  ["hello", "world"],
])
  .then(() => console.log("It worked!"))
  .catch((err) => console.log("It failed!", err));
```

This operation is also atomic – if one of the pairs can't be added, none will be added.

### getMany:

Get many keys at once. This is faster than calling `get` multiple times. Resolves with an array of values.

```js
import { get, getMany } from "idb-keyval";

// Instead of:
Promise.all([get(123), get("hello")]).then(([firstVal, secondVal]) => console.log(firstVal, secondVal));

// It's faster to do:
getMany([123, "hello"]).then(([firstVal, secondVal]) => console.log(firstVal, secondVal));
```

### update:

Transforming a value (eg incrementing a number) using `get` and `set` is risky, as both `get` and `set` are async and non-atomic:

```js
// Don't do this:
import { get, set } from 'idb-keyval';

get('counter').then((val) =>
  set('counter', (val || 0) + 1);
);

get('counter').then((val) =>
  set('counter', (val || 0) + 1);
);
```

With the above, both `get` operations will complete first, each returning `undefined`, then each set operation will be setting `1`. You could fix the above by queuing the second `get` on the first `set`, but that isn't always feasible across multiple pieces of code. Instead:

```js
// Instead:
import { update } from "idb-keyval";

update("counter", (val) => (val || 0) + 1);
update("counter", (val) => (val || 0) + 1);
```

This will queue the updates automatically, so the first `update` set the `counter` to `1`, and the second `update` sets it to `2`.

### del:

Delete a particular key from the store.

```js
import { del } from "idb-keyval";

del("hello");
```

### delMany:

Delete many keys at once. This is faster than calling `del` multiple times.

```js
import { del, delMany } from "idb-keyval";

// Instead of:
Promise.all([del(123), del("hello")])
  .then(() => console.log("It worked!"))
  .catch((err) => console.log("It failed!", err));

// It's faster to do:
delMany([123, "hello"])
  .then(() => console.log("It worked!"))
  .catch((err) => console.log("It failed!", err));
```

### clear:

Clear all values in the store.

```js
import { clear } from "idb-keyval";

clear();
```

### entries:

Get all entries in the store. Each entry is an array of `[key, value]`.

```js
import { entries } from "idb-keyval";

// logs: [[123, 456], ['hello', 'world']]
entries().then((entries) => console.log(entries));
```

### keys:

Get all keys in the store.

```js
import { keys } from "idb-keyval";

// logs: [123, 'hello']
keys().then((keys) => console.log(keys));
```

### values:

Get all values in the store.

```js
import { values } from "idb-keyval";

// logs: [456, 'world']
values().then((values) => console.log(values));
```

### Custom stores:

By default, the methods above use an IndexedDB database named `keyval-store` and an object store named `keyval`. If you want to use something different, see [custom stores](./custom-stores.md).

# Custom stores

Although this library allows you to use custom stores, it adds complexity and gotchas. If you need this kind of control, I recommend [IDB on NPM](https://www.npmjs.com/package/idb) instead. It's a little heavier at ~1k, but it gives you the control you need to manage things like transactions and schema migrations.

Still here? Ok, here's the deal:

## Defining a custom database & store name

The default database name is `keyval-store`, and the default store name is `keyval`. Yes, that's right, the database name contains 'store' and the store name doesn't. I don't know what I was thinking at the time, but I'm stuck with it now for compatibility.

Every method in `idb-keyval` takes an additional parameter, `customStore`, which allows you to use custom names:

```js
import { set, createStore } from "idb-keyval";

const customStore = createStore("custom-db-name", "custom-store-name");

set("hello", "world", customStore);
```

But `createStore` won't let you create multiple stores within the same database. Nor will it let you create a store within an existing database.

```js
// This won't work:
const customStore = createStore("custom-db-name", "custom-store-name");
const customStore2 = createStore("custom-db-name", "custom-store-2");

// But this is ok, because the database name is different:
const customStore3 = createStore("db3", "keyval");
const customStore4 = createStore("db4", "keyval");
```

This restriction is due to how IndexedDB performs schema migrations. If you need this kind of functionality, see [IDB on NPM](https://www.npmjs.com/package/idb), which covers all the callbacks etc you need to manage multiple database connections and updates.

## Managing the custom store yourself

Ok, at this point it really is much better to use something like [IDB on NPM](https://www.npmjs.com/package/idb). But anyway:

A custom store in this library is just a function that takes `"readonly"` or `"readwrite"`, a callback that provides an IDB store, and returns whatever that callback returns. Here's the implementation for `createStore`:

```js
import { promisifyRequest } from "idb-keyval";

function createStore(dbName, storeName) {
  const request = indexedDB.open(dbName);
  request.onupgradeneeded = () => request.result.createObjectStore(storeName);
  const dbp = promisifyRequest(request);

  return (txMode, callback) => dbp.then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
}
```

You could create your own that does something more complicated if you want! But hey, did I mention [IDB on NPM](https://www.npmjs.com/package/idb)?
