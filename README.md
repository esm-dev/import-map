# @esm.sh/import-map

An [Import Maps](https://wicg.github.io/import-maps/) manager, with features:

- Parse import maps from JSON/HTML
- Resolve specifiers to URLs using import map matching rules
- Add npm/jsr/github modules from [esm.sh](https://esm.sh) CDN
- Generate `integrity` entries for added modules

## Installation

```bash
npm i @esm.sh/import-map
```

## API

### `createBlankImportMap(baseURL?: string)`

Create an empty import map:

```ts
import { createBlankImportMap } from "@esm.sh/import-map";

const im = createBlankImportMap("file:///");
```

### `importMapFrom(value: any, baseURL?: string)`

Build an import map from a JS object.
Supports `config`, `imports`, `scopes`, and `integrity`.
Non-string values inside these maps are removed during validation.

```ts
import { importMapFrom } from "@esm.sh/import-map";

const im = importMapFrom({
  imports: { react: "https://esm.sh/react@19.2.4/es2022/react.mjs" },
  integrity: { "https://esm.sh/react@19.2.4/es2022/react.mjs": "sha384-..." },
});
```

### `parseImportMapFromJson(json: string, baseURL?: string)`

Parse an import map from JSON text.
Preserves and validates `config`, `imports`, `scopes`, and `integrity`.

```ts
import { parseImportMapFromJson } from "@esm.sh/import-map";

const im = parseImportMapFromJson(`{
  "imports": {
    "react": "https://esm.sh/react@19.2.4/es2022/react.mjs"
  }
}`);
```

### `parseImportMapFromHtml(html: string, baseURL?: string)`

Parse the first `<script type="importmap">` from HTML (browser environment). Returns an empty import map if no `importmap` script tag is found.

```ts
import { parseImportMapFromHtml } from "@esm.sh/import-map";

const im = parseImportMapFromHtml(`<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.2.4/es2022/react.mjs"
    }
  }
</script>`);
```

> Note: This function requires a browser environment.

### `resolve(importMap: ImportMap, specifier: string, containingFile: string)`

Resolve a specifier using import-map matching rules:

```ts
import { resolve } from "@esm.sh/import-map";

const [url, ok] = resolve(im, "react", "file:///app/main.ts");
```

Returns `[resolvedUrl, true]` when matched, otherwise `[originalSpecifier, false]`.

### `addImport(importMap: ImportMap, specifier: string, noSRI?: boolean)`

Fetch package metadata from [esm.sh](https://esm.sh) CDN and add an import entry (plus relevant deps)
into the map.

Supported specifiers include:

- npm: `react@19.2.4`, `react-dom@19/client`
- jsr: `jsr:@std/fs@1.0.0`
- github: `gh:owner/repo@tag`

Behavior highlights:

- adds top-level specifier into `imports`
- adds nested deps into `scopes` when needed
- cleans up empty scopes
- updates `integrity` unless `noSRI` is `true`

```ts
import { addImport, createBlankImportMap } from "@esm.sh/import-map";

const im = createBlankImportMap();
await addImport(im, "react-dom@19/client");
```

### `isSupportImportMap()`

Returns whether the current browser supports import maps.

```ts
import { isSupportImportMap } from "@esm.sh/import-map";

const supported = isSupportImportMap();
```

### `isBlankImportMap(importMap: ImportMap)`

Returns `true` when `imports` and `scopes` are empty.

```ts
import { isBlankImportMap } from "@esm.sh/import-map";

const blank = isBlankImportMap(im);
```

## Development

```bash
npm test
npm run build
```

## License

MIT
