/** The import maps follow the spec at https://wicg.github.io/import-maps/. */
export interface ImportMap {
  baseURL?: URL;
  config?: Record<string, string>;
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
  integrity?: Record<string, string>;
}

/** Create a blank import map. */
export function createBlankImportMap(baseURL?: string): ImportMap;

/** Create an import map from the given object. */
export function importMapFrom(v: any, baseURL?: string): ImportMap;

/** Parse the import map from a JSON string. */
export function parseImportMapFromJson(json: string, baseURL?: string): ImportMap;

/** Parse the import map from the given HTML. (Requires Browser environment) */
export function parseImportMapFromHtml(html: string, baseURL?: string): ImportMap;

/**
 * Add an import from esm.sh CDN to the import map.
 *
 * @param importMap - The import map to add the import to.
 * @param specifier - The specifier of the import to add.
 * @param noSRI - Whether to add the import without SRI.
 * @returns A promise that resolves when the import is added.
 */
export function addImport(importMap: ImportMap, specifier: string, noSRI?: boolean): Promise<void>;

/** Resolve the specifier with the import map. */
export function resolve(importMap: ImportMap, specifier: string, containingFile: string): [url: string, ok: boolean];

/** Check if current browser supports import maps. */
export function isSupportImportMap(): boolean;

/** Check if the import map is blank. */
export function isBlankImportMap(importMap: ImportMap): boolean;
