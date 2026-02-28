# @esm.sh/import-map

An [Import Maps](https://wicg.github.io/import-maps/) parser and resolver, with features:

- Parse import maps from JSON/HTML
- Resolve specifiers to URLs using import map matching rules
- Add npm/jsr/github modules from [esm.sh](https://esm.sh) CDN
- Generate `integrity` entries for added modules

## Installation

```bash
npm i @esm.sh/import-map
```

## API

### `new ImportMap(init?: ImportMapRaw, baseURL?: string)`

Create an import map instance:

```ts
import { ImportMap } from "@esm.sh/import-map";

const im = new ImportMap();
```

You can also initialize from a raw object:

```ts
const im = new ImportMap({
  config: { cdn: "https://esm.sh", target: "es2022" },
  imports: { react: "https://esm.sh/react@19.2.4/es2022/react.mjs" },
  scopes: {
    "https://esm.sh/": {
      scheduler: "https://esm.sh/scheduler@0.27.0/es2022/scheduler.mjs",
    },
  },
  integrity: {
    "https://esm.sh/react@19.2.4/es2022/react.mjs": "sha384-...",
  },
});
```

### `parseFromJson(json: string, baseURL?: string)`

Parse an import map from JSON text.
Preserves and validates `config`, `imports`, `scopes`, and `integrity`.

```ts
import { parseFromJson } from "@esm.sh/import-map";

const im = parseFromJson(`{
  "imports": {
    "react": "https://esm.sh/react@19.2.4/es2022/react.mjs"
  }
}`);
```

### `parseFromHtml(html: string, baseURL?: string)`

Parse the first `<script type="importmap">` from HTML (browser environment). Returns an empty import map if no `importmap` script tag is found.

```ts
import { parseFromHtml } from "@esm.sh/import-map";

const im = parseFromHtml(`<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.2.4/es2022/react.mjs"
    }
  }
</script>`);
```

> Note: This function requires a browser environment.

### `ImportMap.addImport(specifier: string, noSRI?: boolean)`

The `addImport` method fetches package metadata from [esm.sh](https://esm.sh) CDN and adds an entry (plus relevant deps) to the map.

Supported specifiers include:

- npm: `react@19.2.4`, `react-dom@19/client`
- jsr: `jsr:@std/fs@1.0.0`
- github: `gh:owner/repo@tag`

Behavior highlights:

- adds top-level entries into `imports`
- adds nested deps into `scopes` when needed
- cleans up empty scopes
- updates `integrity` unless `noSRI` is `true`

```ts
import { ImportMap } from "@esm.sh/import-map";

const im = new ImportMap();
await im.addImport("react-dom@19/client");
```

### `setFetcher(fetcher: (url: string | URL) => Promise<Response>)`

Override the default `fetch` used internally by `addImport`.
This is useful for caching metadata responses, or to use a custom fetch implementation.

```ts
// Use a custom fetch with cache.
setFetcher(cacheFetch);

// Restore default behavior.
setFetcher(globalThis.fetch);
```

### `ImportMap.resolve(specifier: string, containingFile: string)`

The `resolve` method resolves a specifier using import-map matching rules:

```ts
const [url, ok] = im.resolve("react", "file:///app/main.ts");
```

Returns `[resolvedUrl, true]` when matched, otherwise `[originalSpecifier, false]`.

### `ImportMap.raw`

The `raw` getter returns a clean, key-ordered import-map object (`ImportMapRaw`):

```ts
const raw = im.raw;
// {
//   config?: { ... },
//   imports?: { ... },
//   scopes?: { ... },
//   integrity?: { ... },
// }
```

### `isSupportImportMap()`

function `isSupportImportMap()` returns whether the current browser supports import maps.

```ts
import { isSupportImportMap } from "@esm.sh/import-map";

const supported = isSupportImportMap();
```

## Development

```bash
bun test
bun run build
```

## License

MIT
