import type { ImportMap } from "../types/index.d.ts";

/** Resolve the specifier with the import map. */
export function resolve(importMap: ImportMap, specifier: string, containingFile: string): [string, boolean] {
  const { baseURL, imports, scopes } = importMap;
  const { origin, pathname } = new URL(containingFile, baseURL);
  const sameOriginScopes: [string, ImportMap["imports"]][] = [];
  for (const scopeName in scopes ?? {}) {
    const scopeUrl = new URL(scopeName, baseURL);
    if (scopeUrl.origin === origin) {
      sameOriginScopes.push([scopeUrl.pathname, (scopes ?? {})[scopeName]]);
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
  if (origin === baseURL.origin) {
    const url = matchImport(specifier, imports);
    if (url) {
      return [url, true];
    }
  }
  return [specifier, false];
}

function matchImport(specifier: string, imports: ImportMap["imports"]): string | null {
  if (specifier in imports) {
    return imports[specifier];
  }
  let bestMatch: string | null = null;
  let bestKeyLength = -1;
  for (const [k, v] of Object.entries(imports)) {
    if (k.endsWith("/") && specifier.startsWith(k) && k.length > bestKeyLength) {
      bestMatch = v + specifier.slice(k.length);
      bestKeyLength = k.length;
    }
  }
  return bestMatch;
}
