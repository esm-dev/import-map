import type { ImportMap } from "../types/import-map.d.ts";

/** Create a blank import map. */
export function createBlankImportMap(baseURL?: string): ImportMap {
  return {
    $baseURL: new URL(baseURL ?? ".", "file:///").href,
    imports: {},
    scopes: {},
  };
}

/** Create an import map from the given object. */
export function importMapFrom(v: any, baseURL?: string): ImportMap {
  const im = createBlankImportMap(baseURL);
  if (isObject(v)) {
    const { imports, scopes } = v;
    if (isObject(imports)) {
      validateImports(imports);
      im.imports = imports as ImportMap["imports"];
    }
    if (isObject(scopes)) {
      validateScopes(scopes);
      im.scopes = scopes as ImportMap["scopes"];
    }
  }
  return im;
}

/** Parse the import map from JSON. */
export function parseImportMapFromJson(json: string, baseURL?: string): ImportMap {
  const importMap: ImportMap = {
    $baseURL: new URL(baseURL ?? ".", "file:///").href,
    imports: {},
    scopes: {},
  };
  const v = JSON.parse(json);
  if (isObject(v)) {
    const { imports, scopes } = v;
    if (isObject(imports)) {
      validateImports(imports);
      importMap.imports = imports as ImportMap["imports"];
    }
    if (isObject(scopes)) {
      validateScopes(scopes);
      importMap.scopes = scopes as ImportMap["scopes"];
    }
  }
  return importMap;
}

/** Parse the import map from the given HTML. (requires Browser environment) */
export function parseImportMapFromHtml(html: string, baseURL?: string): ImportMap {
  const tplEl = document.createElement("template");
  tplEl.innerHTML = html;
  const scriptEl: HTMLScriptElement | null = tplEl.content.querySelector("script[type='importmap']");
  if (scriptEl) {
    return parseImportMapFromJson(scriptEl.textContent!, baseURL);
  }
  return createBlankImportMap(baseURL);
}

/** Resolve the specifier with the import map. */
export function resolve(importMap: ImportMap, specifier: string, containingFile: string): [string, boolean] {
  const { $baseURL, imports, scopes } = importMap;
  const { origin, pathname } = new URL(containingFile, $baseURL);
  const sameOriginScopes: [string, ImportMap["imports"]][] = [];
  for (const scopeName in scopes) {
    const scopeUrl = new URL(scopeName, $baseURL);
    if (scopeUrl.origin === origin) {
      sameOriginScopes.push([scopeUrl.pathname, scopes[scopeName]]);
    }
  }
  sameOriginScopes.sort(([a], [b]) => b.split("/").length - a.split("/").length);
  if (sameOriginScopes.length > 0) {
    for (const [scopePathname, scopeImports] of sameOriginScopes) {
      if (pathname.startsWith(scopePathname)) {
        const url = matchImport(specifier, scopeImports);
        if (url) {
          return [url, true];
        }
      }
    }
  }
  if (origin === new URL($baseURL).origin) {
    const url = matchImport(specifier, imports);
    if (url) {
      return [url, true];
    }
  }
  return [specifier, false];
}

/** Check if current browser supports import maps. */
export function isSupportImportMap(): boolean {
  return !(globalThis.HTMLScriptElement?.supports?.("importmap"));
}

/** Check if the import map is blank. */
export function isBlankImportMap(importMap: ImportMap) {
  const { imports, scopes } = importMap;
  if ((isObject(imports) && Object.keys(imports).length > 0) || (isObject(scopes) && Object.keys(scopes).length > 0)) {
    return false;
  }
  return true;
}

/** Check if the given two import maps are the same. */
export function isSameImportMap(a: ImportMap, b: ImportMap): boolean {
  if (!isSameImports(a.imports, b.imports)) {
    return false;
  }
  for (const k in a.scopes) {
    if (!(k in b.scopes) || !isObject(b.scopes[k])) {
      return false;
    }
    if (!isSameImports(a.scopes[k], b.scopes[k])) {
      return false;
    }
  }
  return true;
}

function matchImport(specifier: string, imports: ImportMap["imports"]): string | null {
  if (specifier in imports) {
    return imports[specifier];
  }
  for (const [k, v] of Object.entries(imports)) {
    if (k.endsWith("/")) {
      if (specifier.startsWith(k)) {
        return v + specifier.slice(k.length);
      }
    } else if (specifier.startsWith(k + "/")) {
      return v + specifier.slice(k.length);
    }
  }
  return null;
}

function validateImports(imports: Record<string, unknown>) {
  for (const [k, v] of Object.entries(imports)) {
    if (!v || typeof v !== "string") {
      delete imports[k];
    }
  }
}

function validateScopes(imports: Record<string, unknown>) {
  for (const [k, v] of Object.entries(imports)) {
    if (isObject(v)) {
      validateImports(v);
    } else {
      delete imports[k];
    }
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSameImports(a: Record<string, string>, b: Record<string, string>): boolean {
  if (Object.keys(a).length !== Object.keys(b).length) {
    return false;
  }
  for (const k in a) {
    if (a[k] !== b[k]) {
      return false;
    }
  }
  return true;
}
