import { satisfies, valid } from "semver";
import type { ImportMap } from "./importmap.ts";

type ImportInfo = {
  name: string;
  version?: string;
  subPath?: string;
  github?: boolean;
  jsr?: boolean;
  external?: boolean;
  dev?: boolean;
};

type ImportMeta = ImportInfo & {
  module: string;
  integrity: string;
  dts?: string;
  exports?: string[];
  imports?: string[];
  peerImports?: string[];
};

type Fetcher = (url: string | URL) => Promise<Response>;

let fetch: Fetcher = globalThis.fetch;

/**
 * Set the fetcher to use for fetching import meta.
 *
 * @param fetcher - The fetcher to use.
 */
export function setFetcher(fetcher: Fetcher): void {
  fetch = fetcher;
}

const KNOWN_TARGETS = new Set([
  "es2015",
  "es2016",
  "es2017",
  "es2018",
  "es2019",
  "es2020",
  "es2021",
  "es2022",
  "es2023",
  "es2024",
  "esnext",
]);

const ESM_TARGETS = new Set([
  "es2015",
  "es2016",
  "es2017",
  "es2018",
  "es2019",
  "es2020",
  "es2021",
  "es2022",
  "es2023",
  "es2024",
  "esnext",
  "denonext",
  "deno",
  "node",
]);

const SPECIFIER_MARK_SEPARATOR = "\x00";
const META_CACHE_MEMO = new Map<string, Promise<ImportMeta>>();

/**
 * Add an import from esm.sh CDN to the import map.
 *
 * @param importMap - The import map to add the import to.
 * @param specifier - The specifier of the import to add.
 * @param noSRI - Whether to add the import without SRI.
 * @returns A promise that resolves when the import is added.
 */
export async function addImport(importMap: ImportMap, specifier: string, noSRI?: boolean): Promise<void> {
  const imp = parseImportSpecifier(specifier);
  const config = importMap.config ?? {};
  const target = normalizeTarget(config.target);
  const cdnOrigin = normalizeCdnOrigin(config.cdn);
  const meta = await fetchImportMeta(cdnOrigin, imp, target);
  const mark = new Set<string>();

  await addImportImpl(importMap, mark, meta, false, undefined, cdnOrigin, target, noSRI ?? false);
  pruneScopeSpecifiersShadowedByImports(importMap);
  pruneEmptyScopes(importMap);
}

async function addImportImpl(
  importMap: ImportMap,
  mark: Set<string>,
  imp: ImportMeta,
  indirect: boolean,
  targetImports: Record<string, string> | undefined,
  cdnOrigin: string,
  target: string,
  noSRI: boolean,
): Promise<void> {
  const markedSpecifier = specifierOf(imp) + SPECIFIER_MARK_SEPARATOR + imp.version;
  if (mark.has(markedSpecifier)) {
    return;
  }
  mark.add(markedSpecifier);

  const cdnScopeKey = cdnOrigin + "/";
  const cdnScopeImports = importMap.scopes?.[cdnScopeKey];

  const imports = indirect ? (targetImports ?? ensureScope(importMap, cdnScopeKey)) : importMap.imports;
  const moduleUrl = moduleUrlOf(cdnOrigin, target, imp);
  const currentSpecifier = specifierOf(imp);
  imports[currentSpecifier] = moduleUrl;

  await updateIntegrity(importMap, imp, moduleUrl, cdnOrigin, target, noSRI);

  if (!indirect) {
    if (cdnScopeImports) {
      delete cdnScopeImports[currentSpecifier];
    }
    pruneEmptyScopes(importMap);
  }

  let allDeps: { pathname: string; isPeer: boolean }[] = [];
  if (imp.peerImports) {
    allDeps.push(...imp.peerImports.map((pathname) => ({ pathname, isPeer: true })));
  }
  if (imp.imports) {
    allDeps.push(...imp.imports.map((pathname) => ({ pathname, isPeer: false })));
  }

  await Promise.all(
    allDeps.map(async ({ pathname, isPeer }) => {
      if (pathname.startsWith("/node/")) {
        return;
      }

      const depImport = parseEsmPath(pathname);
      if (depImport.name === imp.name) {
        depImport.version = imp.version;
      }

      const depSpecifier = specifierOf(depImport);
      const existingUrl = importMap.imports[depSpecifier] ?? importMap.scopes?.[cdnScopeKey]?.[depSpecifier];
      let scopedTargetImports = targetImports;
      if (existingUrl?.startsWith(cdnOrigin + "/")) {
        const existingImport = parseEsmPath(existingUrl);
        const existingVersion = valid(existingImport.version);
        if (existingVersion && depImport.version === existingImport.version) {
          return;
        }
        if (existingVersion && depImport.version && !valid(depImport.version)) {
          if (satisfies(existingVersion, depImport.version, { includePrerelease: true })) {
            return;
          }
          if (isPeer) {
            console.warn(
              "incorrect peer dependency(unmeet " + depImport.version + "): " + depImport.name + "@" + existingVersion,
            );
            return;
          }
          const scope = cdnOrigin + "/" + esmSpecifierOf(imp) + "/";
          scopedTargetImports = ensureScope(importMap, scope);
        }
      }

      const depMeta = await fetchImportMeta(cdnOrigin, depImport, target);
      await addImportImpl(importMap, mark, depMeta, !isPeer, scopedTargetImports, cdnOrigin, target, noSRI);
    }),
  );

  pruneEmptyScopes(importMap);
}

async function updateIntegrity(
  importMap: ImportMap,
  imp: ImportMeta,
  moduleUrl: string,
  cdnOrigin: string,
  target: string,
  noSRI: boolean,
): Promise<void> {
  if (noSRI) {
    if (importMap.integrity) {
      delete importMap.integrity[moduleUrl];
    }
    return;
  }

  if (!hasExternalImports(imp)) {
    if (imp.integrity) {
      importMap.integrity ??= {};
      importMap.integrity[moduleUrl] = imp.integrity;
    }
    return;
  }

  const integrityMeta = await fetchImportMeta(
    cdnOrigin,
    {
      name: imp.name,
      version: imp.version,
      subPath: imp.subPath,
      github: imp.github,
      jsr: imp.jsr,
      external: true,
      dev: imp.dev,
    },
    target,
  );
  if (integrityMeta.integrity) {
    importMap.integrity ??= {};
    importMap.integrity[moduleUrl] = integrityMeta.integrity;
  }
}

function normalizeTarget(target: string | undefined): string {
  if (target && KNOWN_TARGETS.has(target)) {
    return target;
  }
  return "es2022";
}

function normalizeCdnOrigin(cdn: string | undefined): string {
  if (cdn && (cdn.startsWith("https://") || cdn.startsWith("http://"))) {
    try {
      return new URL(cdn).origin;
    } catch (error) {
      // ignore invalid cdn
      console.warn("invalid cdn: " + cdn);
    }
  }
  return "https://esm.sh";
}

function specifierOf(imp: ImportInfo): string {
  let prefix = "";
  if (imp.github) {
    prefix = "gh:";
  } else if (imp.jsr) {
    prefix = "jsr:";
  }
  return prefix + imp.name + (imp.subPath ? "/" + imp.subPath : "");
}

function esmSpecifierOf(imp: ImportMeta): string {
  const prefix = imp.github ? "gh/" : imp.jsr ? "jsr/" : "";
  const external = hasExternalImports(imp) ? "*" : "";
  return prefix + external + imp.name + "@" + imp.version;
}

function parseImportSpecifier(specifier: string): ImportInfo {
  const imp: ImportInfo = { name: "", version: "" };

  let source = specifier.trim();
  if (source.startsWith("gh:")) {
    imp.github = true;
    source = source.slice(3);
  } else if (source.startsWith("jsr:")) {
    imp.jsr = true;
    source = source.slice(4);
  }

  let scopeName = "";
  if (source.startsWith("@") || imp.github) {
    const index = source.indexOf("/");
    if (index === -1) {
      throw new Error("invalid specifier: " + specifier);
    }
    scopeName = source.slice(0, index);
    source = source.slice(index + 1);
  }

  let [maybePkgNameAndVersion, ...subPath] = source.split("/");
  let [pkgNameNoScope, pkgVersion] = maybePkgNameAndVersion.split("@", 2);
  if (scopeName) {
    imp.name = scopeName + "/" + pkgNameNoScope;
    imp.version = pkgVersion;
  } else {
    imp.name = pkgNameNoScope;
    imp.version = pkgVersion;
  }
  imp.subPath = subPath.join("/");

  if (!imp.name) {
    throw new Error("invalid package name or version: " + specifier);
  }

  return imp;
}

function parseEsmPath(pathnameOrUrl: string): ImportInfo {
  let pathname: string;
  if (pathnameOrUrl.startsWith("https://") || pathnameOrUrl.startsWith("http://")) {
    pathname = new URL(pathnameOrUrl).pathname;
  } else if (pathnameOrUrl.startsWith("/")) {
    pathname = pathnameOrUrl.split("#")[0].split("?")[0];
  } else {
    throw new Error("invalid pathname or url: " + pathnameOrUrl);
  }

  const imp: ImportInfo = { name: "", version: "" };

  if (pathname.startsWith("/gh/")) {
    imp.github = true;
    pathname = pathname.slice(3);
  } else if (pathname.startsWith("/jsr/")) {
    imp.jsr = true;
    pathname = pathname.slice(4);
  }

  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) {
    throw new Error("invalid pathname: " + pathnameOrUrl);
  }

  let seg0 = segs[0];
  if (seg0.startsWith("*")) {
    seg0 = seg0.slice(1);
  }

  let pkgNameNoScope: string;
  let pkgVersion: string;
  let subPath: string;
  let hasTargetSegment: boolean;

  if (seg0.startsWith("@")) {
    if (!segs[1]) {
      throw new Error("invalid pathname: " + pathnameOrUrl);
    }
    [pkgNameNoScope, pkgVersion] = segs[1].split("@", 2);
    imp.name = seg0 + "/" + pkgNameNoScope;
    imp.version = pkgVersion;
    hasTargetSegment = ESM_TARGETS.has(segs[2]);
    subPath = segs.slice(hasTargetSegment ? 3 : 2).join("/");
  } else {
    [pkgNameNoScope, pkgVersion] = seg0.split("@", 2);
    imp.name = pkgNameNoScope;
    imp.version = pkgVersion;
    hasTargetSegment = ESM_TARGETS.has(segs[1]);
    subPath = segs.slice(hasTargetSegment ? 2 : 1).join("/");
  }

  if (subPath) {
    if (hasTargetSegment && subPath.endsWith(".mjs")) {
      subPath = subPath.slice(0, -4);
      if (subPath.endsWith(".development")) {
        subPath = subPath.slice(0, -12);
        imp.dev = true;
      }
      if (subPath !== pkgNameNoScope) {
        if (subPath === "__" + pkgNameNoScope) {
          subPath = pkgNameNoScope;
        }
        imp.subPath = subPath;
      }
    } else {
      imp.subPath = subPath;
    }
  }

  return imp;
}

function moduleUrlOf(cdnOrigin: string, target: string, imp: ImportMeta): string {
  let url = cdnOrigin + "/" + esmSpecifierOf(imp) + "/" + target + "/";
  if (imp.subPath) {
    if (imp.dev || imp.subPath === "jsx-dev-runtime") {
      url += imp.subPath + ".development.mjs";
    } else {
      url += imp.subPath + ".mjs";
    }
    return url;
  }

  const fileName = imp.name.includes("/") ? imp.name.split("/").at(-1)! : imp.name;
  return url + fileName + ".mjs";
}

function registryPrefix(imp: ImportInfo): string {
  if (imp.github) {
    return "gh/";
  }
  if (imp.jsr) {
    return "jsr/";
  }
  return "";
}

function hasExternalImports(meta: ImportMeta): boolean {
  if (meta.peerImports && meta.peerImports.length > 0) {
    return true;
  }
  if (meta.imports) {
    for (const dep of meta.imports) {
      if (!dep.startsWith("/node/") && !dep.startsWith("/" + meta.name + "@")) {
        return true;
      }
    }
  }
  return false;
}

async function fetchImportMeta(cdnOrigin: string, imp: ImportInfo, target: string): Promise<ImportMeta> {
  const star = imp.external ? "*" : "";
  const version = imp.version ? "@" + imp.version : "";
  const subPath = imp.subPath ? "/" + imp.subPath : "";
  const targetQuery = target !== "es2022" ? "&target=" + encodeURIComponent(target) : "";
  const url = cdnOrigin + "/" + star + registryPrefix(imp) + imp.name + version + subPath + "?meta" + targetQuery;

  const cached = META_CACHE_MEMO.get(url);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const res = await fetch(url);
    if (res.status === 404) {
      throw new Error("package not found: " + imp.name + version + subPath);
    }
    if (!res.ok) {
      throw new Error("unexpected http status " + res.status + ": " + await res.text());
    }

    const bodyText = await res.text();
    let data: Partial<ImportMeta>;
    try {
      data = JSON.parse(bodyText) as Partial<ImportMeta>;
    } catch (error) {
      throw new Error("invalid meta response from " + url + ": " + String(error));
    }
    return {
      name: data.name ?? imp.name,
      version: data.version ?? imp.version,
      subPath: imp.subPath,
      github: imp.github,
      jsr: imp.jsr,
      external: imp.external,
      dev: imp.dev,
      module: data.module ?? "",
      integrity: data.integrity ?? "",
      exports: data.exports ?? [],
      imports: data.imports ?? [],
      peerImports: data.peerImports ?? [],
    };
  })();

  META_CACHE_MEMO.set(url, pending);
  try {
    return await pending;
  } catch (error) {
    META_CACHE_MEMO.delete(url);
    throw error;
  }
}

function ensureScope(importMap: ImportMap, scopeKey: string): Record<string, string> {
  importMap.scopes ??= {};
  importMap.scopes[scopeKey] ??= {};
  return importMap.scopes[scopeKey]!;
}

function pruneEmptyScopes(importMap: ImportMap): void {
  if (!importMap.scopes) {
    return;
  }
  for (const [scope, imports] of Object.entries(importMap.scopes)) {
    if (Object.keys(imports).length === 0) {
      delete importMap.scopes[scope];
    }
  }
}

function pruneScopeSpecifiersShadowedByImports(importMap: ImportMap): void {
  for (const [scopeKey, scopedImports] of Object.entries(importMap.scopes)) {
    if (scopeKey.startsWith("https://") || scopeKey.startsWith("http://")) {
      const url = new URL(scopeKey);
      if (url.pathname === "/") {
        for (const specifier of Object.keys(scopedImports)) {
          if (specifier in importMap.imports) {
            delete scopedImports[specifier];
          }
        }
      }
    }
  }
}
