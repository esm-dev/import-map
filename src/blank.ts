import type { ImportMap } from "../types/index.d.ts";

/** Create a blank import map. */
export function createBlankImportMap(baseURL?: string): ImportMap {
  return {
    baseURL: new URL(baseURL ?? ".", "file:///"),
    imports: {},
  };
}

/** Check if the import map is blank. */
export function isBlankImportMap(importMap: ImportMap) {
  const { imports, scopes } = importMap;
  if (Object.keys(imports).length > 0 || (scopes && Object.keys(scopes).length > 0)) {
    return false;
  }
  return true;
}
