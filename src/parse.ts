import type { ImportMap } from "../types/index.d.ts";
import { createBlankImportMap } from "./blank.ts";

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

/** Parse the import map from a JSON string. */
export function parseImportMapFromJson(json: string, baseURL?: string): ImportMap {
  const im = createBlankImportMap(baseURL);
  const v = JSON.parse(json);
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
