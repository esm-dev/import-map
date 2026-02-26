/**
 * The import map config.
 *
 * The config is not a standard part of the import map spec,
 * it is used to create the new import url from CDN.
 */
export interface ImportMapConfig {
  /** The CDN origin to use for the import map. defaults to `https://esm.sh` */
  cdn?: string;
  /** The build target for the new import url from CDN. defaults to `es2022` */
  target?: string;
}

/** The import map raw object. */
export interface ImportMapRaw {
  /** The config for generating the new import url from CDN. */
  config?: ImportMapConfig;
  /** The imports of the import map. */
  imports?: Record<string, string>;
  /** The scopes of the import map. */
  scopes?: Record<string, Record<string, string>>;
  /** The integrity of the import map. */
  integrity?: Record<string, string>;
}

/** The import map class. */
export class ImportMap {
  constructor(baseURL?: string, raw?: ImportMapRaw);

  /** The base URL of the import map. */
  get baseURL(): URL;

  /** Check if the import map is blank. */
  get isBlank(): boolean;

  /** Return a clean, key-ordered raw import map object. */
  get raw(): ImportMapRaw;

  /**
   * Add an import from esm.sh CDN to the import map.
   *
   * @param importMap - The import map to add the import to.
   * @param specifier - The specifier of the import to add.
   * @param noSRI - Whether to add the import without SRI.
   * @returns A promise that resolves when the import is added.
   */
  addImport(importMap: ImportMap, specifier: string, noSRI?: boolean): Promise<void>;

  /** Resolve the specifier with the import map. */
  resolve(importMap: ImportMap, specifier: string, containingFile: string): [url: string, ok: boolean];
}

/** Parse the import map from a JSON string. */
export function parseFromJson(json: string, baseURL?: string): ImportMap;

/** Parse the import map from the given HTML. (Requires Browser environment) */
export function parseFromHtml(html: string, baseURL?: string): ImportMap;

/** Check if current browser supports import maps. */
export function isSupportImportMap(): boolean;
