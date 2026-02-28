import type { ImportMapConfig, ImportMapRaw } from "../types/index.d.ts";
import { addImport } from "./add.ts";
import { resolve } from "./resolve.ts";
import { sanitizeScopes, sanitizeStringMap } from "./sanitize.ts";

export class ImportMap {
  #baseURL: URL;

  config: ImportMapConfig = {};
  imports: Record<string, string> = {};
  scopes: Record<string, Record<string, string>> = {};
  integrity: Record<string, string> = {};

  constructor(baseURL?: string | URL, init?: ImportMapRaw) {
    this.#baseURL = new URL(baseURL ?? globalThis.location?.href ?? "file:///");
    if (init) {
      this.config = sanitizeStringMap(init.config) as ImportMapConfig;
      this.imports = sanitizeStringMap(init.imports);
      this.scopes = sanitizeScopes(init.scopes);
      this.integrity = sanitizeStringMap(init.integrity);
    }
  }

  get baseURL(): URL {
    return this.#baseURL;
  }

  get raw(): ImportMapRaw {
    const json: ImportMapRaw = {};
    const config = sortStringMap(this.config);
    if (Object.keys(config).length > 0) {
      json.config = config;
    }
    const imports = sortStringMap(this.imports);
    if (Object.keys(imports).length > 0) {
      json.imports = imports;
    }
    const scopes = sortScopes(this.scopes);
    if (Object.keys(scopes).length > 0) {
      json.scopes = scopes;
    }
    const integrity = sortStringMap(this.integrity);
    if (Object.keys(integrity).length > 0) {
      json.integrity = integrity;
    }
    return json;
  }

  addImport(specifier: string, noSRI?: boolean): Promise<void> {
    return addImport(this, specifier, noSRI);
  }

  resolve(specifier: string, containingFile: string): [string, boolean] {
    return resolve(this, specifier, containingFile);
  }
}

function sortStringMap(map: ImportMapConfig): ImportMapConfig;
function sortStringMap(map: Record<string, string>): Record<string, string>;
function sortStringMap(map: ImportMapConfig | Record<string, string>): ImportMapConfig | Record<string, string> {
  const source = map as Record<string, string | undefined>;
  const next: Record<string, string> = {};
  for (const key of Object.keys(source).sort()) {
    const value = source[key];
    if (typeof value === "string") {
      next[key] = value;
    }
  }
  return next;
}

function sortScopes(scopes: Record<string, Record<string, string>>): Record<string, Record<string, string>> {
  const next: Record<string, Record<string, string>> = {};
  for (const scopeKey of Object.keys(scopes).sort()) {
    const scopeImports = sortStringMap(scopes[scopeKey]!);
    if (Object.keys(scopeImports).length > 0) {
      next[scopeKey] = scopeImports;
    }
  }
  return next;
}

export { setFetcher } from "./add.ts";
