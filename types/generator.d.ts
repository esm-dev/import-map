import type { ImportMap } from "./import-map.d.ts";

/** Search a NPM package from esm.sh CDN and add it to the import map. */
export function addImport(importMap: ImportMap, specifier: string): void;
