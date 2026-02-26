import { ImportMap } from "./importmap.ts";

/** Parse the import map from a JSON string. */
export function parseFromJson(json: string, baseURL?: string): ImportMap {
  const im = new ImportMap(baseURL);
  const v = JSON.parse(json);
  if (isObject(v)) {
    const { config, imports, scopes, integrity } = v;
    if (isObject(config)) {
      validateStringMap(config);
      im.config = config as ImportMap["config"];
    }
    if (isObject(imports)) {
      validateImports(imports);
      im.imports = imports as ImportMap["imports"];
    }
    if (isObject(scopes)) {
      validateScopes(scopes);
      im.scopes = scopes as ImportMap["scopes"];
    }
    if (isObject(integrity)) {
      validateStringMap(integrity);
      im.integrity = integrity as ImportMap["integrity"];
    }
  }
  return im;
}

/** Parse the import map from the given HTML. (requires Browser environment) */
export function parseFromHtml(html: string, baseURL?: string): ImportMap {
  const tplEl = document.createElement("template");
  tplEl.innerHTML = html;
  const scriptEl: HTMLScriptElement | null = tplEl.content.querySelector("script[type='importmap']");
  if (scriptEl) {
    return parseFromJson(scriptEl.textContent!, baseURL);
  }
  return new ImportMap(baseURL);
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

function validateStringMap(map: Record<string, unknown>) {
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== "string") {
      delete map[k];
    }
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
