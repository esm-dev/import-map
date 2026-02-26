/** Check if current browser supports import maps. */
export function isSupportImportMap(): boolean {
  return !!globalThis.HTMLScriptElement?.supports?.("importmap");
}
