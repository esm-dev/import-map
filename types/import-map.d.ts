/** The import maps follow the spec at https://wicg.github.io/import-maps/. */
export interface ImportMap {
  $src?: string;
  $baseURL: string;
  imports: Record<string, string>;
  scopes: Record<string, Record<string, string>>;
}

/** Create a blank import map. */
export function createBlankImportMap(): ImportMap;

/** Create an import map from the given object. */
export function importMapFrom(v: any, baseURL?: string): ImportMap;

/** Parse the import map from JSON. */
export function parseImportMapFromJson(json: string, baseURL?: string): ImportMap;

/** Parse the import map from the given HTML. (requires Browser environment) */
export function parseImportMapFromHtml(html: string, baseURL?: string): ImportMap;

/** Resolve the specifier with the import map. */
export function resolve(importMap: ImportMap, specifier: string, containingFile: string): string;

/** Check if current browser supports import maps. */
export function isSupportImportMap(): boolean;

/** Check if the import map is blank. */
export function isBlankImportMap(importMap: ImportMap): boolean;

/** Check if the given two import maps are the same. */
export function isSameImportMap(a: ImportMap, b: ImportMap): boolean;
