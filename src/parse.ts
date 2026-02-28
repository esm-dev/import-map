import { ImportMap } from "./importmap.ts";
import { isObject, sanitizeScopes, sanitizeStringMap } from "./sanitize.ts";

/** Parse the import map from a JSON string. */
export function parseFromJson(json: string, baseURL?: string): ImportMap {
  const im = new ImportMap({}, baseURL);
  const v = JSON.parse(json);
  if (isObject(v)) {
    const { config, imports, scopes, integrity } = v;
    im.config = sanitizeStringMap(config) as ImportMap["config"];
    im.imports = sanitizeStringMap(imports) as ImportMap["imports"];
    im.scopes = sanitizeScopes(scopes) as ImportMap["scopes"];
    im.integrity = sanitizeStringMap(integrity) as ImportMap["integrity"];
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
  return new ImportMap({}, baseURL);
}
