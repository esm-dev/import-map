import type { ImportMap } from "../types/index.d.ts";

/** Resolve the specifier with the import map. */
export function resolve(importMap: ImportMap, specifier: string, containingFile: string): [string, boolean] {
  const baseURL = importMap.baseURL ?? new URL(globalThis.location?.href ?? "file:///");
  const referrer = new URL(containingFile, baseURL);
  const [specifierWithoutHash, hashPart = ""] = specifier.split("#", 2);
  const [specifierWithoutQuery, queryPart = ""] = specifierWithoutHash.split("?", 2);
  const hash = hashPart ? `#${hashPart}` : "";
  const query = queryPart ? `?${queryPart}` : "";
  const cleanSpecifier = specifierWithoutQuery;

  const scopes = importMap.scopes ?? {};
  const scopeEntries = Object.entries(scopes)
    .map(([scopeKey, scopeImports]) => {
      try {
        return [new URL(scopeKey, baseURL).toString(), scopeImports] as const;
      } catch {
        return [scopeKey, scopeImports] as const;
      }
    })
    .sort((a, b) => compareScopeKeys(a[0], b[0]));

  for (const [scopeKey, scopeImports] of scopeEntries) {
    if (!referrer.toString().startsWith(scopeKey)) {
      continue;
    }
    const mapped = resolveWith(cleanSpecifier, scopeImports ?? {});
    if (mapped) {
      return [normalizeUrl(baseURL, mapped) + query + hash, true];
    }
  }

  const mapped = resolveWith(cleanSpecifier, importMap.imports);
  if (mapped) {
    return [normalizeUrl(baseURL, mapped) + query + hash, true];
  }

  return [cleanSpecifier + query + hash, false];
}

function resolveWith(specifier: string, imports: Record<string, string>): string | null {
  if (imports[specifier]) {
    return imports[specifier];
  }
  if (!specifier.includes("/")) {
    return null;
  }

  const prefixKeys = Object.keys(imports)
    .filter((k) => k.endsWith("/") && specifier.startsWith(k))
    .sort((a, b) => b.length - a.length || (a < b ? 1 : -1));

  for (const key of prefixKeys) {
    const value = imports[key];
    if (value && value.endsWith("/")) {
      return value + specifier.slice(key.length);
    }
  }

  return null;
}

function compareScopeKeys(a: string, b: string): number {
  const aSlashCount = a.split("/").length;
  const bSlashCount = b.split("/").length;
  if (aSlashCount !== bSlashCount) {
    return bSlashCount - aSlashCount;
  }
  return a < b ? 1 : -1;
}

function normalizeUrl(baseURL: URL, path: string): string {
  if (path.startsWith("/") || path.startsWith("./") || path.startsWith("../")) {
    return new URL(path, baseURL).toString();
  }
  return path;
}
