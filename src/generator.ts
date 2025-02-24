import type { ImportMap } from "../types/import-map.d.ts";

let cdnOrigin = "https://esm.sh";

export function setCDNOrigin(origin: string): void {
  const url = new URL(origin);
  cdnOrigin = url.origin;
}

/** Add a module to the import map. */
export function add(importMap: ImportMap, specifier: string): Promise<void> {
  throw new Error("Not implemented");
}

/** Update a module in the import map. */
export function update(importMap: ImportMap, specifier: string, version: string): Promise<void> {
  throw new Error("Not implemented");
}

/** Remove a module from the import map. */
export function remove(importMap: ImportMap): Promise<void> {
  throw new Error("Not implemented");
}

/** Tidy the import map. */
export function tidy(importMap: ImportMap): Promise<void> {
  throw new Error("Not implemented");
}
